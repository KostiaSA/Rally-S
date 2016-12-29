import {stringAsSql, guidAsSql, dateAsSql} from "../sql/SqlCore";
import {emitFieldList, emitFieldList_forUpdate} from "../sql/emitSql";
import {executeSql} from "../sql/MsSqlDb";
import * as express from "express";

export function importFrom1cResponse(req: express.Request, res: express.Response, next: Function) {
    //console.log("api1", req.body);

    res.send(JSON.stringify({}));


}


export async function importFrom1c(json: any): Promise<void> {

    return new Promise<void>(
        (resolve: () => void, reject: (error: string) => void) => {

            // вливаем гонку
            if (!json.Race)
                reject("нет свойства 'Race'");

            let raceFields: any[] = [];

            if (!json.Race.ID)
                reject("нет свойства 'Race.ID'");
            raceFields.push(["ReplGuid", guidAsSql(json.Race.ID)]);

            if (!json.Race.Title)
                reject("нет свойства 'Race.Title'");
            raceFields.push(["Название", stringAsSql(json.Race.Title)]);

            if (!json.Race.StartDate)
                reject("нет свойства 'Race.StartDate'");
            raceFields.push(["Дата", stringAsSql(json.Race.StartDate)]);

            if (!json.Race.EndDate)
                reject("нет свойства 'Race.EndDate'");
            raceFields.push(["[Дата окончания]", stringAsSql(json.Race.EndDate)]);

            if (!json.Race.Location)
                reject("нет свойства 'Race.Location'");
            raceFields.push(["[Место проведения]", stringAsSql(json.Race.Location)]);

            if (!json.Race.DateFirstStage)
                reject("нет свойства 'Race.DateFirstStage'");
            raceFields.push(["ДатаПервогоЭтапа", stringAsSql(json.Race.DateFirstStage)]);

            // if (!json.Race.CountStage)
            //     reject("нет свойства 'Race.CountStage'");
            // raceFields.push(["КоличествоЭтаповДней", json.Race.CountStage]);


            // перебираем этапы

            let specUch_sql = `DECLARE @SpecUchId INT`;

            if (!json.StageCompetitions)
                reject("нет свойства 'StageCompetitions'");
            json.StageCompetitions.forEach((stageCompetition: any) => {
                if (!stageCompetition.StageList) {
                    reject("нет свойства 'StageCompetitions[0].StageList'");
                }

                stageCompetition.StageList.forEach((stage: any) => { // этап/спецучасток _RallySpecUch

                    let specUch_Fields: any[] = [];
                    // "ID": "fa29fa46-7897-4e87-984e-df9848fff974",
                    // "StageDay": 1,
                    // "Date": "2015-12-07",
                    // "Title": "ССУ",
                    // "TitleEn": "",
                    // "MinTime": "00:15:00",
                    // "Length": 4.55,
                    // "CountCheckPoint": 0,

                    if (!stage.ID) {
                        reject("нет свойства 'StageCompetitions[0].StageList[0].ID'");
                        return;
                    }
                    specUch_Fields.push(["ReplGuid", guidAsSql(stage.ID)]);

                    if (!stage.StageDay) {
                        reject("нет свойства 'StageCompetitions[0].StageList[0].StageDay'");
                        return;
                    }
                    specUch_Fields.push(["StageDay", stage.StageDay]);

                    if (!stage.Date) {
                        reject("нет свойства 'StageCompetitions[0].StageList[0].Date'");
                        return;
                    }
                    specUch_Fields.push(["Дата", dateAsSql(stage.Date)]);

                    if (stage.Title === undefined) {
                        reject("нет свойства 'StageCompetitions[0].StageList[0].Title'");
                        return;
                    }
                    specUch_Fields.push(["Название", stringAsSql(stage.Title)]);

                    if (stage.TitleEn === undefined) {
                        reject("нет свойства 'StageCompetitions[0].StageList[0].TitleEn'");
                        console.error("xxx", "=" + stage.TitleEn + "=");
                        return;
                    }
                    specUch_Fields.push(["НазваниеАнгл", stringAsSql(stage.TitleEn)]);

                    if (!stage.MinTime) {
                        reject("нет свойства 'StageCompetitions[0].StageList[0].MinTime'");
                        return;
                    }
                    let hours = Number.parseInt(stage.MinTime.split(":")[0]);
                    let mins = Number.parseInt(stage.MinTime.split(":")[1]);
                    specUch_Fields.push(["[Мин.время]", hours * 60 + mins]);

                    if (!stage.Length) {
                        reject("нет свойства 'StageCompetitions[0].StageList[0].Length'");
                        return;
                    }
                    specUch_Fields.push(["Длина", stage.Length]);

                    specUch_Fields.push(["_RallyHeader", "@RallyHeaderId"]);


                    specUch_sql += `
SELECT @SpecUchId=Ключ FROM _RallySpecUch WHERE ReplGuid=${guidAsSql(stage.ID)}
IF @SpecUchId IS NULL
BEGIN
  INSERT _RallySpecUch(${ emitFieldList(specUch_Fields, "target")}) VALUES(${ emitFieldList(specUch_Fields, "source")})
END
ELSE
BEGIN
  UPDATE _RallySpecUch SET ${ emitFieldList_forUpdate(specUch_Fields)} WHERE ReplGuid=${guidAsSql(stage.ID)}
END                 
`;

                });


            });


            let sql = `
DECLARE @RallyHeaderId INT
SELECT @RallyHeaderId=Ключ FROM _RallyHeader WHERE ReplGuid=${guidAsSql(json.Race.ID)}
IF @RallyHeaderId IS NULL
BEGIN
  INSERT _RallyHeader(${ emitFieldList(raceFields, "target")}) VALUES(${ emitFieldList(raceFields, "source")})
  SELECT @RallyHeaderId=SCOPE_IDENTITY()
END
ELSE
BEGIN
  UPDATE _RallyHeader SET ${ emitFieldList_forUpdate(raceFields)} WHERE ReplGuid=${guidAsSql(json.Race.ID)}
END                 
            
${specUch_sql}            
            
`;

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