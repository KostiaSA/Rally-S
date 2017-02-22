import {stringAsSql, guidAsSql, dateAsSql} from "../sql/SqlCore";
import {emitFieldList, emitFieldList_forUpdate} from "../sql/emitSql";
import {executeSql} from "../sql/MsSqlDb";
import * as express from "express";
import * as moment from "moment";

function getRandomString(length: number = 10): string {
    let str = Math.random().toString(36).slice(2, 12);
    str = str + Math.random().toString(36).slice(2, 12);
    return str.slice(0, length);
}

export function importFrom1cPenalResponse(req: express.Request, res: express.Response, next: Function) {
    console.log("importFrom1cPenalResponse", req.body);


    importFrom1cPenal(req.body)
        .then(() => {
            res.send(JSON.stringify({result: "Ok"}));

        })
        .catch((err: any) => {
            res.send(JSON.stringify({result: err.toString()}));
        });

}


export async function importFrom1cPenal(json: any): Promise<void> {

    var fs = require('fs');
    fs.writeFile("/rally/importFrom1c_penal_" + getRandomString(10) + ".json", JSON.stringify(json), function (err: any) {
        if (err) {
            return console.log(err);
        }
        console.log("Import file was saved!");
    });

    return new Promise<void>(
        (resolve: () => void, reject: (error: string) => void) => {

            if (!json.Race)
                reject("нет свойства 'Race'");

            if (!json.Race.ID)
                reject("нет свойства 'Race.ID'");

            let sql = `TRUNCATE TABLE _temp_sport_penal` + "\n";
            sql += `TRUNCATE TABLE _temp_road_penal` + "\n";

            // перебираем SportsList
            if (!json.Race.SportsList)
                reject("нет свойства 'Race.SportsList'");

            json.Race.SportsList.forEach((sportItem: any, sportItemIndex: number) => {

                let penalFields: any[] = [];
                penalFields.push(["RallyHeaderGuid", guidAsSql(json.Race.ID)]);


                //////// спецучасток ///////////////////
                if (!sportItem.ID) {
                    reject("нет свойства 'sportItem.ID'");
                }
                penalFields.push(["RallySpecUchGuid", guidAsSql(sportItem.ID)]);

                //////// RaceNumber ///////////////////
                if (!sportItem.Number) {
                    reject("нет свойства 'sportItem.Number'");
                }
                penalFields.push(["RaceNumber", "'" + sportItem.Number + "'"]);

                //////// время ///////////////////
                if (!sportItem.Time) {
                    reject("нет свойства 'sportItem.Time'");
                }
                penalFields.push(["Time", stringAsSql("1900-01-01 " + sportItem.Time)]);

                sql += `INSERT _temp_sport_penal(${ emitFieldList(penalFields, "target")}) VALUES(${ emitFieldList(penalFields, "source")})` + "\n";
            });

            // перебираем SportsList
            if (!json.Race.RoadList)
                reject("нет свойства 'Race.RoadList'");

            json.Race.RoadList.forEach((sportItem: any, sportItemIndex: number) => {

                let penalFields: any[] = [];
                penalFields.push(["RallyHeaderGuid", guidAsSql(json.Race.ID)]);


                //////// спецучасток ///////////////////
                if (!sportItem.ID) {
                    reject("нет свойства 'sportItem.ID'");
                }
                penalFields.push(["RallySpecUchGuid", guidAsSql(sportItem.ID)]);

                //////// RaceNumber ///////////////////
                if (!sportItem.Number) {
                    reject("нет свойства 'sportItem.Number'");
                }
                penalFields.push(["RaceNumber", "'" + sportItem.Number + "'"]);

                //////// время ///////////////////
                if (!sportItem.Time) {
                    reject("нет свойства 'sportItem.Time'");
                }
                penalFields.push(["Time", stringAsSql("1900-01-01 " + sportItem.Time)]);

                sql += `INSERT _temp_road_penal(${ emitFieldList(penalFields, "target")}) VALUES(${ emitFieldList(penalFields, "source")})` + "\n";
            });


            sql += "EXEC _import_penal";
            console.log(sql);

            executeSql(sql)
                .then(() => {
                    resolve();
                })
                .catch((e: any) => {
                    console.error(e);
                    reject(e.toString());
                })

        });

}