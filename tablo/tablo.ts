import {stringAsSql, guidAsSql, dateAsSql} from "../sql/SqlCore";
import {emitFieldList, emitFieldList_forUpdate} from "../sql/emitSql";
import {executeSql} from "../sql/MsSqlDb";
import * as express from "express";

export function tabloResponse(req: express.Request, res: express.Response, next: Function) {
    console.log("tabloResponse", req.body);


    let sql = "select 1";

    executeSql(sql)
        .then((result: any) => {
            res.send("<body>да это мы</body>");

        })
        .catch((err: any) => {
            res.send("<body>" + err + "</body>");
        });

}

