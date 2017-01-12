import {stringAsSql, guidAsSql, dateAsSql} from "../sql/SqlCore";
import {emitFieldList, emitFieldList_forUpdate} from "../sql/emitSql";
import {executeSql} from "../sql/MsSqlDb";
import * as express from "express";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMServer from "react-dom/server";

export function tabloResponse(req: express.Request, res: express.Response, next: Function) {
    // console.log("tabloResponse", req.body);


    let sql = "EXEC [_Rally_РезультатыЭтапа] 5, 1, 0, 4";

    executeSql(sql)
        .then((result: any) => {

            let tabloRows = result[0];
            console.log(tabloRows);
            console.log(tabloRows[0]);
            let tabloColumns: any[] = [];
            for (var k in tabloRows[0])
                tabloColumns.push(k);
            //let tabloColumns=tabloRows[0].keys();
            console.log(tabloColumns);


            let renderBodyRows = ():JSX.Element[] => {

                return tabloRows.map((row:any)=>{

                    let renderTds = ():JSX.Element[] => {
                        let tds:JSX.Element[]=[];

                        for (let colName of tabloColumns) {
                            // ... do something with s ...
                        }

                        return tds;
                    };

                    return (
                      <tr>
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

