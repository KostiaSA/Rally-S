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

function sortRowsByColumnName(rows: any[], colName: string) {
    rows.sort((a: any, b: any) => {
        let aa = Number.parseInt(a[colName]);
        let bb = Number.parseInt(b[colName]);
        //console.log(aa, bb);
        return aa - bb;
    });
}


export function tabloResponse(req: express.Request, res: express.Response, next: Function) {
    // console.log("tabloResponse", req.body);


    let sql = "EXEC [_Rally_РезультатыЭтапа] 5, 1, 0, 4";

    executeSql(sql)
        .then((result: any) => {

            let tabloRows = result[0];
            //console.log(tabloRows);
            //console.log(tabloRows[0]);
            let tabloColumns: any[] = [];
            for (var colName in tabloRows[0]) {
                tabloColumns.push(colName);
            }

            // первичная сортировка
            for (var colName in tabloRows[0]) {
                if (colName.startsWith("StartNPP")) {
                    sortRowsByColumnName(tabloRows, colName);
                    break;
                }
            }
            //let tabloColumns=tabloRows[0].keys();
            //console.log(tabloColumns);

            let renderHeader1Row = (): JSX.Element => {

                let renderTds = (): JSX.Element[] => {
                    let tds: JSX.Element[] = [];

                    for (let colName of tabloColumns) {
                        if (colName.startsWith("StartNPP") || colName.startsWith("CheckNPP") || colName.startsWith("FinishNPP")) {
                            tds.push(<th>{colName}</th>);
                        }
                        if (colName.startsWith("StartTime") || colName.startsWith("CheckTime") || colName.startsWith("CheckDiff") || colName.startsWith("CheckGap")) {
                            tds.push(<th>{colName}</th>);
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

                return tabloRows.map((row: any,index:number) => {

                    let renderTds = (): JSX.Element[] => {
                        let tds: JSX.Element[] = [];

                        for (let colName of tabloColumns) {
                            if (colName.startsWith("StartNPP") || colName.startsWith("CheckNPP") || colName.startsWith("FinishNPP")) {
                                tds.push(<td style={{textAlign:"center"}}>{row[colName]}</td>);
                            }

                            if (colName.startsWith("StartTime") || colName.startsWith("CheckTime") || colName.startsWith("CheckDiff") || colName.startsWith("CheckGap")) {
                                let date = row[colName] as Date;
                                //date=new Date(date.getMilliseconds()+date.getTimezoneOffset()*60000); // убираем time зону
                                let hh = date.getUTCHours();
                                let mm = date.getUTCMinutes();
                                let ss = date.getUTCSeconds();
                                if (hh === 0 && mm === 0 && ss == 0)
                                    tds.push(<td style={{textAlign:"center"}}></td>);
                                else
                                    tds.push(<td
                                        style={{textAlign:"center"}}>{pad(hh, 2)}:{pad(mm, 2)}:{pad(ss, 2)}</td>);
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


            let x = (
                <html>
                <head>
                    <meta charSet="utf-8"/>
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

