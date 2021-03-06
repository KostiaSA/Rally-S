import * as express from "express";
import crypto = require("crypto-js");
import {
    GET_ENCRYPT_KEY_CMD,
    LOGIN_CMD,
    IReq,
    IGetEncryptKeyReq,
    IGetEncryptKeyAns,
    IAns,
    ILoginReq,
    ILoginAns,
    BAD_LOGIN_PASSWORD,
    LOAD_RALLYHEADER_CMD,
    LOAD_RALLYSPECUCH_CMD,
    ILoadRallyHeaderReq,
    ILoadRallyHeaderAns,
    RallyHeader_replTable,
    IRallyHeader,
    ILoadRallySpecUchReq,
    ILoadRallySpecUchAns,
    RallySpecUch_replTable,
    IRallySpecUch,
    RallyPunkt_replTable,
    LOAD_RALLYPUNKT_CMD,
    ILoadRallyPunktReq,
    ILoadRallyPunktAns,
    IRallyPunkt,
    UsersLink_replTable,
    LegRegistration_replTable,
    ILoadLegRegistrationAns,
    ILoadLegRegistrationReq,
    ILegRegistration,
    LOAD_LEGREGISTRATION_CMD,
    // LOAD_PILOTS_CMD,
    // ILoadPilotsReq,
    // ILoadPilotsAns,
    // Pilots_replTable,
    // IPilot,
    LOAD_CHECKPOINTS_CMD,
    CheckPoint_replTable,
    ILoadCheckPointsReq,
    ILoadCheckPointsAns,
    ICheckPoint,
    ISaveCheckPointsAns,
    ISaveCheckPointsReq,
    SAVE_CHECKPOINTS_CMD
} from "./api/api";
import {getInstantPromise} from "./utils/getInstantPromise";
import {stringAsSql, dateTimeAsSql} from "./sql/SqlCore";
import {getValueFromSql, executeSql} from "./sql/MsSqlDb";
import {replaceAll} from "./utils/replaceAll";

function sqlDateToStr(date: Date): any {
    return replaceAll(date.toISOString().replace("Z", "").replace("T", " "), "-", "/").split(".")[0];
}

export function commonApiResponse(req: express.Request, res: express.Response, next: Function) {
    //console.log("api1", req.body);

    if (req.body.cmd === GET_ENCRYPT_KEY_CMD) {
        res.send(JSON.stringify({encryptKey: getEncryptKeyFromSessionId(req.body.sessionId)}));
        return;
    }

    let ans: Promise<any>;

    var bytes = crypto.AES.decrypt(req.body.body, getEncryptKeyFromSessionId(req.body.sessionId));
    let decryptedBody = JSON.parse(bytes.toString(crypto.enc.Utf8)) as any;
    //let decryptedBody = JSON.parse(req.body.body) as any;


    switch (req.body.cmd) {
        case LOGIN_CMD:
            ans = LOGIN_handler(decryptedBody);
            break;
        case LOAD_RALLYHEADER_CMD:
            ans = LOAD_RALLYHEADER_handler(decryptedBody);
            break;
        case LOAD_RALLYSPECUCH_CMD:
            ans = LOAD_RALLYSPECUCH_handler(decryptedBody);
            break;
        case LOAD_RALLYPUNKT_CMD:
            ans = LOAD_RALLYPUNKT_handler(decryptedBody);
            break;
        case LOAD_LEGREGISTRATION_CMD:
            ans = LOAD_LEGREGISTRATION_handler(decryptedBody);
            break;
        // case LOAD_PILOTS_CMD:
        //     ans = LOAD_PILOTS_handler(decryptedBody);
        //     break;
        case LOAD_CHECKPOINTS_CMD:
            ans = LOAD_CHECKPOINTS_handler(decryptedBody);
            break;
        case SAVE_CHECKPOINTS_CMD:
            ans = SAVE_CHECKPOINTS_handler(decryptedBody);
            break;
        default:
            ans = getInstantPromise({error: "invalid api command"});
    }

    ans
        .then((ansObj: any) => {
            res.send(JSON.stringify(ansObj));
        })
        .catch((err: any) => {
            res.send(JSON.stringify({error: err.toString()}));
        });

}

function getEncryptKeyFromSessionId(sessionId: string): string {
    return crypto.MD5("xeedtt" + sessionId + "gdfdtr55").toString().substr(2, 32);
}


// function GET_ENCRYPT_KEY_handler(req: IGetEncryptKeyReq): IGetEncryptKeyAns {
//     return ({encryptKey: "key123"})
// }

async function LOGIN_handler(req: ILoginReq): Promise<ILoginAns> {

    let sql = `SELECT ISNULL((SELECT [Password] FROM _Users WHERE [Login]=${stringAsSql(req.login)}),'ujfgff74hdr4wio3645hfdt') Password`;
    let sql2 = `SELECT ISNULL((SELECT FIO FROM _Users WHERE [Login]=${stringAsSql(req.login)}),'') FIO`;

    let pass = await getValueFromSql(sql, "Password");
    let fio = await getValueFromSql(sql2, "FIO");

    if (req.password === pass)
        return getInstantPromise({user: fio});
    else
        return getInstantPromise({error: BAD_LOGIN_PASSWORD, user: ""});

}

async function LOAD_RALLYHEADER_handler(req: ILoadRallyHeaderReq): Promise<ILoadRallyHeaderAns> {
    let replTable = RallyHeader_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;

    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({rallyHeader: undefined});
    else {

        sql = `
SELECT TOP 1
  [Ключ],[Номер],[Название],[Дата],[EngName],[Дата окончания],[Место проведения]
FROM 

[_RallyHeader] WHERE Ключ IN (SELECT _RallyHeader from [_RallySpecUch] where [Текущий этап]=1)
  
SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        let row = rows[0][0];
        let dbts = rows[1][0]["dbts"];

        if (row) {
            let rallyHeader: IRallyHeader = {
                id: row["Ключ"],
                num: row["Номер"],
                name: row["Название"],
                begDate: row["Дата"],
                endDate: row["Дата окончания"],
                place: row["Место проведения"],
            };

            return getInstantPromise({rallyHeader: rallyHeader, dbts: dbts});
        }
        else {
            return getInstantPromise({rallyHeader: undefined, dbts: dbts});
        }

    }
}


async function LOAD_RALLYSPECUCH_handler(req: ILoadRallySpecUchReq): Promise<ILoadRallySpecUchAns> {
    let replTable = RallySpecUch_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;

    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({rallySpecUch: undefined});
    else {
        sql = `
SELECT 
  Ключ, Номер, Название, Дата, Длина, TimeZone, NPP, [Кол.кругов], StageDay, НазваниеАнгл, [Мин.время]
FROM 
  [_RallySpecUch] where [Текущий этап]=1
  
SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        //let row = rows[0][0];
        let dbts = rows[1][0]["dbts"];


        if (rows[0] && rows[0].length>0) {
            let rallySpecUchArray=rows[0].map((row:any)=>{

                let rallySpecUch: IRallySpecUch = {
                    id: row["Ключ"],
                    num: row["Номер"],
                    name: row["Название"],
                    date: row["Дата"],
                    length: row["Длина"],
                    timeZone: row["TimeZone"],
                    npp: row["NPP"], // номер по порядку
                    cycleCount: row["Кол.кругов"], // к-во кругов
                    stageDay: row["StageDay"],
                    nameEn: row["НазваниеАнгл"],
                    minTimeMinutes: row["Мин.время"],
                };
                return rallySpecUch;

            });

            return getInstantPromise({rallySpecUch: rallySpecUchArray, dbts: dbts});
        }
        else {
            return getInstantPromise({rallySpecUch: undefined, dbts: dbts});
        }

    }
}

async function LOAD_RALLYPUNKT_handler(req: ILoadRallyPunktReq): Promise<ILoadRallyPunktAns> {
    let replTable = UsersLink_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable IN (${replTable},${RallyPunkt_replTable}) and DBTS>${req.dbts || "0x00"}`;
    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({rallyPunkt: undefined as any});
    else {
        sql = `
SELECT 
  _RallyPunkt.Ключ,
  _RallyPunkt.Номер,
  _RallyPunkt.Название,
  _RallyPunkt.Length,
  _RallyPunkt.NPP
    
FROM [_RallyPunkt] 
JOIN _RallySpecUch ON _RallySpecUch.Ключ=_RallyPunkt._RallySpecUch
JOIN _UsersLink ON _UsersLink._RallyPunkt=_RallyPunkt.Ключ
WHERE 
  _UsersLink.Login=${stringAsSql(req.login)} AND
  _RallySpecUch.[Текущий этап]=1 
ORDER BY _RallyPunkt.NPP, _RallyPunkt.[№ повтора проезда]  

SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable IN (${replTable},${RallyPunkt_replTable})  
`;

        let rows = await executeSql(sql);

        //console.log("rows", rows);

        //let row = rows[0][0];
        let dbts = rows[1][0]["dbts"];

        //if (row) {

            let rallyPunkts:IRallyPunkt[]=rows[0].map((row:any)=>{

                let rallyPunkt: IRallyPunkt = {
                    id: row["Ключ"],
                    num: row["Номер"],
                    name: row["Название"],
                    length: row["Length"],
                    NPP: row["NPP"]
                };

                return rallyPunkt;
            });


            return getInstantPromise({rallyPunkt: rallyPunkts, dbts: dbts});
        //}
        //else {
          //  return getInstantPromise({rallyPunkt: undefined, dbts: dbts});
        //}

    }
}

async function LOAD_LEGREGISTRATION_handler(req: ILoadLegRegistrationReq): Promise<ILoadLegRegistrationAns> {
    let replTable = LegRegistration_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;
    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({legRegistration: undefined});
    else {

        sql = `
SELECT 
  _LegRegistration.Ключ id,
  _LegRegistration.Пилот Пилот,
  _LegRegistration.ПилотАнгл ПилотАнгл,
  _LegRegistration.RaceNumber raceNumber,
  _LegRegistration.Автомобиль Автомобиль,
  _LegRegistration.Класс Класс,
  _LegRegistration.Страна Страна
  
FROM _LegRegistration 
JOIN _RallyHeader ON _RallyHeader.Ключ=_LegRegistration._RallyHeader
JOIN _RallySpecUch ON _RallySpecUch._RallyHeader=_LegRegistration._RallyHeader
WHERE 
  _RallySpecUch.[Текущий этап]=1
ORDER BY 
  _LegRegistration.RaceNumber

SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        //console.log("rows", rows);

        let regRows = rows[0];
        let dbts = rows[1][0]["dbts"];

        if (regRows) {
            let legRegistration: ILegRegistration[] = regRows.map((item: any) => {
                // id: number;
                // pilotName: string;
                // pilotNameEn: string;
                // raceNumber: string;
                // autoName:string;
                // autoClass:string;
                // country:string;

                return {
                    id: item["id"],
                    pilotName: item["Пилот"],
                    pilotNameEn: item["ПилотАнгл"],
                    raceNumber: item["raceNumber"],
                    autoName:item["Автомобиль"],
                    autoClass:item["Класс"],
                    country:item["Страна"]

                } as ILegRegistration;

            });

            return getInstantPromise({legRegistration: legRegistration, dbts: dbts});
        }
        else {
            return getInstantPromise({legRegistration: undefined, dbts: dbts});
        }

    }
}

// async function LOAD_PILOTS_handler(req: ILoadPilotsReq): Promise<ILoadPilotsAns> {
//     let replTable = Pilots_replTable;
//
//     let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;
//     let count = await getValueFromSql(sql, "cnt");
//
//     if (count === 0)
//         return getInstantPromise({pilots: undefined});
//     else {
//
//         sql = `
// SELECT Ключ,Имя,EngName,AutoName FROM _Pilots
// SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}
// `;
//
//         let rows = await executeSql(sql);
//
//         //console.log("rows", rows);
//
//         let pilotsRows = rows[0];
//         let dbts = rows[1][0]["dbts"];
//
//         if (pilotsRows) {
//             let pilots: IPilot[] = pilotsRows.map((item: any) => {
//                 return {
//                     id: item["Ключ"],
//                     name: item["Имя"],
//                     engName: item["EngName"],
//                     autoName: item["AutoName"]
//                 } as IPilot;
//
//             });
//
//             return getInstantPromise({pilots: pilots, dbts: dbts});
//         }
//         else {
//             return getInstantPromise({pilots: undefined, dbts: dbts});
//         }
//
//     }
// }


// todo надо загружать чекпоинты со всех пунктов
async function LOAD_CHECKPOINTS_handler(req: ILoadCheckPointsReq): Promise<ILoadCheckPointsAns> {
    let replTable = CheckPoint_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;
    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({checkPoints: undefined});
    else {

        //console.log("LOAD_CHECKPOINTS_handler", req.dbts);

        sql = `
IF (${req.rallyPunktId}>0)       
    SELECT [Ключ]
          ,[CheckTime]
          ,[PenaltyTime]
          ,[_LegRegistration]
          ,[_RallyPunkt]
          ,[ReplGuid]
          ,[MobileID]
          ,[MobileLogin]
          ,[MobileDevice]
          ,[MobileTime]
    FROM 
      [_CheckPoint]
    WHERE _RallyPunkt=${req.rallyPunktId}  
ELSE  -- кольцевая, грузим все чекпоинты
    SELECT [Ключ]
          ,[CheckTime]
          ,[PenaltyTime]
          ,[_LegRegistration]
          ,[_RallyPunkt]
          ,[ReplGuid]
          ,[MobileID]
          ,[MobileLogin]
          ,[MobileDevice]
          ,[MobileTime]
    FROM 
      [_CheckPoint]
    WHERE _RallyPunkt IN (SELECT Ключ FROM _RallyPunkt WHERE _RallySpecUch=(SELECT Ключ from [_RallySpecUch] where [Текущий этап]=1))  

SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        //console.log("rows", rows);

        let checkPointsRows = rows[0];
        let dbts = rows[1][0]["dbts"];

        if (checkPointsRows) {
            let checkpoints: ICheckPoint[] = checkPointsRows.map((item: any) => {
                return {
                    legRegsId: item["_LegRegistration"],
                    rallyPunktId: item["_RallyPunkt"],
                    checkTime: sqlDateToStr(item["CheckTime"]),
                    penaltyTime: sqlDateToStr(item["PenaltyTime"]),
                    mobileId: item["MobileID"],
                    mobileTime: item["MobileTime"],
                    mobileLogin: item["MobileLogin"],
                    mobileDevice: item["MobileDevice"],
                    syncOk: true
                } as ICheckPoint;

            });

            //console.log("checkpoints", checkpoints);
            return getInstantPromise({checkPoints: checkpoints, dbts: dbts});
        }
        else {
            return getInstantPromise({checkPoints: undefined, dbts: dbts});
        }

    }
}

async function SAVE_CHECKPOINTS_handler(req: ISaveCheckPointsReq): Promise<ISaveCheckPointsAns> {

    // console.log("SAVE_CHECKPOINTS_handler",req);

    let sqlBatch = `
 DECLARE @id INT 
 DECLARE @CheckTime DATETIME
 DECLARE @PenaltyTime DATETIME
 DECLARE @LegRegistration INT
 DECLARE @RallyPunkt INT
 DECLARE @MobileID VARCHAR(MAX)
 DECLARE @MobileLogin VARCHAR(MAX)
 DECLARE @MobileDevice VARCHAR(MAX)
 DECLARE @MobileTime  DATETIME
`;

    req.checkPoints.forEach((item: ICheckPoint) => {
        let sql = `
       
SET @id = -1 
SET @CheckTime = ${ dateTimeAsSql(item.checkTime) }
SET @LegRegistration = ${ item.legRegsId }
SET @RallyPunkt = ${ item.rallyPunktId }
SET @MobileID = ${ stringAsSql(item.mobileId) }
SET @MobileLogin = ${ stringAsSql(item.mobileLogin) }
SET @MobileDevice = ${ stringAsSql(item.mobileDevice) }
SET @MobileTime = ${ dateTimeAsSql(item.mobileTime) }
       
SELECT @id=Ключ FROM _CheckPoint WHERE MobileId=${ stringAsSql(item.mobileId) }
        
IF @id=-1 
BEGIN
  INSERT _CheckPoint ( 
      [CheckTime]
      ,[_LegRegistration]
      ,[_RallyPunkt]
      ,[MobileID]
      ,[MobileLogin]
      ,[MobileDevice]
      ,[MobileTime]
      )
  VALUES (
      @CheckTime,
      @LegRegistration,
      @RallyPunkt,
      @MobileID,
      @MobileLogin,
      @MobileDevice,
      @MobileTime
  )
END
ELSE
BEGIN
  UPDATE _CheckPoint SET
      [CheckTime]=@CheckTime,
      [_LegRegistration]=@LegRegistration,
      [_RallyPunkt]=@RallyPunkt,
      [MobileID]=@MobileID,
      [MobileLogin]=@MobileLogin,
      [MobileDevice]=@MobileDevice,
      [MobileTime]=@MobileTime
  WHERE Ключ=@id
END
  
`;

        sqlBatch += sql;

    });

    await executeSql(sqlBatch);

    return getInstantPromise({});

}