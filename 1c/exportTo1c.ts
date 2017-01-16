import {stringAsSql, guidAsSql, dateAsSql} from "../sql/SqlCore";
import {emitFieldList, emitFieldList_forUpdate} from "../sql/emitSql";
import {executeSql} from "../sql/MsSqlDb";
import * as express from "express";

export function exportTo1cResponse(req: express.Request, res: express.Response, next: Function) {
    console.log("exportTo1cResponse", req.body);

    exportTo1c()
        .then((result: any[]) => {
            res.send(JSON.stringify({result: result}));

        })
        .catch((err: any) => {
            res.send(JSON.stringify({error: err.toString()}));
        });

}


export async function exportTo1c(): Promise<any[]> {

    return new Promise<any[]>(
        (resolve: (res: any[]) => void, reject: (error: string) => void) => {

            executeSql("EXEC ExportTo1C")
                .then((recordsets: any[]) => {

                    let resArray: any[] = recordsets[0].map((row: any) => {
                        return {
                            Stage: row["Stage"],
                            RaceNumber: row["RaceNumber"],
                            Type: row["Type"],
                            Time: JSON.stringify(row["Time"]).replace("\"","").replace("\"","").replace("T"," ").replace("Z","")
                        }
                    });

                    resolve(resArray);
                })
                .catch((e: any) => {
                    console.error(e);
                    reject(e.toString());
                })

        });

}