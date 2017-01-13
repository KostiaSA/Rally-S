import {stringAsSql, guidAsSql, dateAsSql} from "../sql/SqlCore";
import {emitFieldList, emitFieldList_forUpdate} from "../sql/emitSql";
import {executeSql} from "../sql/MsSqlDb";
import * as express from "express";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMServer from "react-dom/server";


function pad(num: number, size: number) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}

function sortRowsByColumnName(rows: any[], colName: string, colName2: string, desc: boolean = false) {
    rows.sort((a: any, b: any) => {
        let aa = Number.parseInt(a[colName]);
        let bb = Number.parseInt(b[colName]);
        let aa2 = Number.parseInt(a[colName2]);
        let bb2 = Number.parseInt(b[colName2]);
        if (isNaN(aa))
            aa = 100000;
        if (isNaN(bb))
            bb = 100000;

        aa *= 1000000;
        bb *= 1000000;

        if (isNaN(aa2))
            aa2 = 100000;
        if (isNaN(bb2))
            bb2 = 100000;

        //console.log(aa + aa2, bb + bb2);
        if (!desc)
            return (aa + aa2) - (bb + bb2);
        else
            return (bb + bb2) - (aa + aa2);
    });
}

function getColumnClass(colName: string) {
    if (colName.startsWith("StartNPP")) {
        return "start-npp";
    }
    else if (colName.startsWith("CheckNPP")) {
        return "check-npp";
    }
    else if (colName.startsWith("FinishNPP")) {
        return "finish-npp";
    }
    else if (colName.startsWith("StartTime")) {
        return "start-time";
    }
    // else if (colName.startsWith("CheckTime")) {
    //     return "check-time";
    // }
    else if (colName.startsWith("CheckDiff")) {
        return "check-diff";
    }
    else if (colName.startsWith("CheckGap")) {
        return "check-gap";
    }
    else if (colName.startsWith("FinishDiff")) {
        return "finish-diff"
    }

}


export async function tabloResponse(req: express.Request, res: express.Response, next: Function) {
    // console.log("tabloResponse", req.body);

    let preSql = `
SELECT TOP 1
  [Ключ]
FROM 
  [_RallyHeader] WHERE Ключ IN (SELECT _RallyHeader from [_RallySpecUch] where [Текущий этап]=1)
`;
    let preResult = await executeSql(preSql);


    let rallyHeaderId = preResult[0][0].Ключ;
    let etapNum = 1;
    let suOk = 0;
    let suId = 0;
    // DECLARE @RallyID INT -- Ключ таблицы _RallyHeader
    // DECLARE @EtapNum INT -- Номер дня гонки [StageDay] в таблице [_RallySpecUch]
    // DECLARE @SUOk Bit -- итог подводить за день (@SUOk=0) или по спецучастку (@SUOk=1)
    // DECLARE @SUID INT -- Ключ таблицы [_RallySpecUch] - если @SUOk=1

    let sql = `
EXEC [_Rally_РезультатыЭтапа] ${rallyHeaderId}, ${etapNum}, ${suOk}, ${suId}
SELECT Ключ, RaceNumber, Пилот, Автомобиль FROM _LegRegistration WHERE _RallyHeader=${rallyHeaderId}
`;

    executeSql(sql)
        .then((result: any) => {

            let legRegRows = result[1];
            let legRegs: any = {};

            legRegRows.forEach((legReg:any)=>{
                legRegs[legReg.Ключ] = {
                    RaceNumber: legReg.RaceNumber,
                    Пилот: legReg.Пилот,
                    Автомобиль: legReg.Автомобиль
                }
            });

            console.log(legRegRows);

            let tabloRows = result[0];
            //console.log(tabloRows);
            //console.log(tabloRows[0]);
            let tabloColumns: any[] = [];
            for (var colName in tabloRows[0]) {
                tabloColumns.push(colName);
            }

            // первичная сортировка
            let startColName = "";
            for (var colName in tabloRows[0]) {
                if (colName.startsWith("StartNPP")) {
                    startColName = colName;
                    //sortRowsByColumnName(tabloRows, colName);
                    break;
                }
            }


            sortRowsByColumnName(tabloRows, "CheckNPP22", startColName, false);


            //let tabloColumns=tabloRows[0].keys();
            //console.log(tabloColumns);

            let renderHeader1Row = (): JSX.Element => {

                let renderTds = (): JSX.Element[] => {
                    let tds: JSX.Element[] = [];

                    for (let colName of tabloColumns) {
                        if (colName.startsWith("StartNPP") || colName.startsWith("CheckNPP") || colName.startsWith("FinishNPP")) {
                            tds.push(<th className={getColumnClass(colName)}>{colName}</th>);
                        }
                        if (colName.startsWith("StartTime") || colName.startsWith("CheckDiff") || colName.startsWith("CheckGap") || colName.startsWith("FinishDiff")) {
                            tds.push(<th className={getColumnClass(colName)}>{colName}</th>);
                        }
                    }

                    return tds;
                };

                return (
                    <tr>
                        {renderTds()}
                    </tr>
                );
            };


            let renderBodyRows = (): JSX.Element[] => {

                return tabloRows.map((row: any, index: number) => {

                    let renderTds = (): JSX.Element[] => {
                        let tds: JSX.Element[] = [];

                        for (let colName of tabloColumns) {
                            if (colName.startsWith("StartNPP") || colName.startsWith("CheckNPP") || colName.startsWith("FinishNPP")) {
                                tds.push(<td className={getColumnClass(colName)}>{row[colName]}</td>);
                            }

                            if (colName.startsWith("StartTime") || colName.startsWith("CheckDiff") || colName.startsWith("CheckGap") || colName.startsWith("FinishDiff")) {
                                let date = row[colName] as Date;
                                //date=new Date(date.getMilliseconds()+date.getTimezoneOffset()*60000); // убираем time зону
                                let hh = date.getUTCHours();
                                let mm = date.getUTCMinutes();
                                let ss = date.getUTCSeconds();
                                if (hh === 0 && mm === 0 && ss == 0)
                                    tds.push(<td className={getColumnClass(colName)}></td>);
                                else
                                    tds.push(<td
                                        className={getColumnClass(colName)}>{pad(hh, 2)}:{pad(mm, 2)}:{pad(ss, 2)}</td>);
                            }

                        }

                        return tds;
                    };

                    return (
                        <tr key={index}>
                            {renderTds()}
                        </tr>
                    );
                });
            };


            let commonStyle = `
table, th, td { 
  border: 1px solid silver; /* Рамка вокруг таблицы */
  border-collapse: collapse; /* Отображать только одинарные линии */
  
}
               
td, th {
  text-align: center;
  font-family: arial;
  font-size: 13;
  padding: 3;
}

.start-npp, .start-time {
  background-color:white
}

.check-time {
  color:forestgreen;
}

.check-diff {
  color:dodgerblue;
}

.check-gap {
  color:indianred;
}

.finish-npp, .finish-time {
  background-color:lemonchiffon
}
  
`;

            let x = (
                <html>
                <head>
                    <meta charSet="utf-8"/>
                    <style>
                        {commonStyle}
                    </style>
                </head>
                <body>
                <table>
                    <thead>
                    {renderHeader1Row()}
                    </thead>
                    <tbody>
                    {renderBodyRows()}
                    </tbody>
                </table>
                </body>
                </html>
            );

            let html = ReactDOMServer.renderToStaticMarkup(x);

            res.send(html);

        })
        .catch((err: any) => {
            res.send("<body>" + err + "</body>");
        });

}

