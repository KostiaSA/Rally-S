import {stringAsSql, guidAsSql} from "../sql/SqlCore";
import {emitFieldList, emitFieldList_forUpdate} from "../sql/emitSql";
import {executeSql} from "../sql/MsSqlDb";
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

            if (!json.Race.CountStage)
                reject("нет свойства 'Race.CountStage'");
            raceFields.push(["КоличествоЭтаповДней", json.Race.CountStage]);


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
            
`;

            console.log(sql);

            executeSql(sql)
                .then(() => {
                    resolve();
                })
                .catch((e: any) => {
                    reject(e.toString());
                })

        });

}