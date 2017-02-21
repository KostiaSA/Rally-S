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

export function importFrom1cResponse(req: express.Request, res: express.Response, next: Function) {
    console.log("importFrom1cResponse", req.body);


    importFrom1c(req.body)
        .then(() => {
            res.send(JSON.stringify({result: "Ok"}));

        })
        .catch((err: any) => {
            res.send(JSON.stringify({result: err.toString()}));
        });

}


export async function importFrom1c(json: any): Promise<void> {

    var fs = require('fs');
    fs.writeFile("/rally/importFrom1c_" + getRandomString(10) + ".json", JSON.stringify(json), function (err: any) {
        if (err) {
            return console.log(err);
        }
        console.log("Import file was saved!");
    });

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

            if (json.Race.Location)
                raceFields.push(["[Место проведения]", stringAsSql(json.Race.Location)]);

            if (!json.Race.DateFirstStage)
                reject("нет свойства 'Race.DateFirstStage'");
            raceFields.push(["ДатаПервогоЭтапа", stringAsSql(json.Race.DateFirstStage)]);

            // if (!json.Race.CountStage)
            //     reject("нет свойства 'Race.CountStage'");
            // raceFields.push(["КоличествоЭтаповДней", json.Race.CountStage]);


            // перебираем этапы

            let specUch_sql = `
DECLARE @SpecUchId INT
DECLARE @LegRegistrationId INT
`;

            if (!json.StageCompetitions)
                reject("нет свойства 'StageCompetitions'");

            //json.StageCompetitions = [json.StageCompetitions[0]];  // todo убрать к следующей гонке

            json.StageCompetitions.forEach((stageCompetition: any, stageCompetitionIndex: number) => {

                //////// спецучасток ///////////////////
                if (!stageCompetition.Title) {
                    reject("нет свойства 'StageCompetitions[0].Title'");
                }


                if (!stageCompetition.StageList) {
                    reject("нет свойства 'StageCompetitions[0].StageList'");
                }

                stageCompetition.StageList.forEach((stage: any, npp: number) => { // этап/спецучасток _RallySpecUch

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
                    specUch_Fields.push(["NPP", npp + 1]);


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

                    if (stage.ResultList) {
                        stage.ResultList.forEach((result: any, index: number) => { // этап/спецучасток _RallySpecUch
                            // result это
                            // {
                            //     "NumberCrew": 200,
                            //     "Start": "10:05:00",
                            //     "Finish": "10:08:47"
                            // },

                            if (result.Start && result.Start !== "")
                                specUch_sql += `EXEC _import_startovka @SpecUchId, ${result.NumberCrew}, '${moment(stage.Date).format("YYYYMMDD")} ${result.Start}'` + "\n";
                            if (result.Finish && result.Finish !== "")
                                specUch_sql += `EXEC _import_finish @SpecUchId, ${result.NumberCrew}, '${moment(stage.Date).format("YYYYMMDD")} ${result.Finish}'` + "\n";

                        });
                    }


                });

                //////// экипаж ///////////////////
                if (!stageCompetition.CrewList) {
                    reject("нет свойства 'StageCompetitions[0].CrewList'");
                }

                stageCompetition.CrewList.forEach((crew: any, index: number) => { // экипаж _LegRegistration

                    let crew_Fields: any[] = [];
                    // "Number": 200,
                    //     "Pilot": {
                    //     "ID": "02a7f6f5-993a-11e5-8cb2-001e3df01710",
                    //         "Name": "Йоуни",
                    //         "SecondName": "АМПУЯ",
                    //         "NameEN": "Youni",
                    //         "SecondNameEN": "AMPUJA",
                    //         "Country": "Финляндия"
                    // },
                    // "Navigator": {
                    //     "ID": "02a7f6f6-993a-11e5-8cb2-001e3df01710",
                    //         "Name": "Маркку ",
                    //         "SecondName": "ХУРСКАЙНЕН",
                    //         "NameEN": "Markku ",
                    //         "SecondNameEN": "KHURSKAYNEN",
                    //         "Country": "Финляндия"
                    // },
                    // "Mechanic": {
                    //     "ID": "00000000-0000-0000-0000-000000000000",
                    //         "Name": "",
                    //         "SecondName": "",
                    //         "NameEN": "",
                    //         "SecondNameEN": "",
                    //         "Country": ""
                    // },
                    // "Car": "Mitsubishi Pajero Evolution",
                    //     "Class": "Т1",
                    //     "Declarer": {
                    //     "ID": "02a7f6f8-993a-11e5-8cb2-001e3df01710",
                    //         "Name": "",
                    //         "SecondName": "RE Autoclub",
                    //         "NameEN": "",
                    //         "SecondNameEN": "RE Autoclub",
                    //         "Country": "РОССИЯ"
                    // },
                    // "Team": "RE AUTOCLUB",
                    //     "Priority": "",
                    //     "PriorityEN": ""
                    //console.log(index, crew);
                    //console.log("RaceNumber1");
                    if (!crew.Number) {
                        reject("нет свойства 'StageCompetitions[0].CrewList[0].Number'");
                        return;
                    }
                    crew_Fields.push(["RaceNumber", stringAsSql(crew.Number.toString())]);
                    console.log("RaceNumber-start", crew.Number);

                    if (crew.Pilot === undefined) {
                        reject("нет свойства 'StageCompetitions[0].CrewList[0].Pilot'");
                        return;
                    }
                    crew_Fields.push(["Пилот", stringAsSql((crew.Pilot.Name ? crew.Pilot.Name : "") + " " + (crew.Pilot.SecondName ? crew.Pilot.SecondName : ""))]);
                    crew_Fields.push(["ПилотАнгл", stringAsSql((crew.Pilot.NameEN ? crew.Pilot.NameEN : "") + " " + (crew.Pilot.SecondNameEN ? crew.Pilot.SecondNameEN : ""))]);
                    crew_Fields.push(["Страна", stringAsSql(crew.Pilot.Country)]);

                    if (crew.Car === undefined) {
                        reject("нет свойства 'StageCompetitions[0].CrewList[0].Car'");
                        return;
                    }
                    crew_Fields.push(["Автомобиль", stringAsSql(crew.Car)]);

                    if (crew.Class === undefined) {
                        reject("нет свойства 'StageCompetitions[0].CrewList[0].Class'");
                        return;
                    }
                    crew_Fields.push(["Класс", stringAsSql(crew.Class)]);

                    if (crew.Team === undefined) {
                        reject("нет свойства 'StageCompetitions[0].CrewList[0].Team'");
                        return;
                    }
                    crew_Fields.push(["Команда", stringAsSql(crew.Team)]);

                    crew_Fields.push(["_RallyHeader", "@RallyHeaderId"]);

                    let cup = stageCompetition.Title;

                    specUch_sql += `
SET @LegRegistrationId=NULL                    
SELECT @LegRegistrationId=Ключ FROM _LegRegistration WHERE RaceNumber=${crew.Number} AND _RallyHeader=@RallyHeaderId 
IF @LegRegistrationId IS NULL
BEGIN
  INSERT _LegRegistration(${ emitFieldList(crew_Fields, "target")}) VALUES(${ emitFieldList(crew_Fields, "source")})
  SELECT @LegRegistrationId=Ключ FROM _LegRegistration WHERE RaceNumber=${crew.Number} AND _RallyHeader=@RallyHeaderId 
END
ELSE
BEGIN
  UPDATE _LegRegistration SET ${ emitFieldList_forUpdate(crew_Fields)} WHERE Ключ=@LegRegistrationId
END
                 
-- прописываем cup                 
  UPDATE _LegRegistration SET 
    [Участие в соревнованиях]=';' 
  WHERE Ключ=@LegRegistrationId AND [Участие в соревнованиях]=''
     
  UPDATE _LegRegistration SET 
    [Участие в соревнованиях]=[Участие в соревнованиях]+${stringAsSql(cup)}+';' 
  WHERE Ключ=@LegRegistrationId AND CHARINDEX (';'+${stringAsSql(cup)}+';' ,[Участие в соревнованиях])=0   
                 
`;

                    console.log("RaceNumber-fin", crew.Number);


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