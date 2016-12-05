import * as express from "express";
import crypto = require("crypto-js");
import {
    GET_ENCRYPT_KEY_CMD, LOGIN_CMD, IReq, IGetEncryptKeyReq, IGetEncryptKeyAns, IAns, ILoginReq,
    ILoginAns, BAD_LOGIN_PASSWORD, LOAD_RALLYHEADER_CMD, LOAD_RALLYLEG_CMD, ILoadRallyHeaderReq, ILoadRallyHeaderAns,
    RallyHeader_replTable, IRallyHeader, ILoadRallyLegReq, ILoadRallyLegAns, RallyLeg_replTable, IRallyLeg,
    RallyPunkt_replTable, LOAD_RALLYPUNKT_CMD, ILoadRallyPunktReq, ILoadRallyPunktAns, IRallyPunkt, UsersLink_replTable,
    LegRegistration_replTable, ILoadLegRegistrationAns, ILoadLegRegistrationReq, ILegRegistration,
    LOAD_LEGREGISTRATION_CMD, LOAD_PILOTS_CMD, ILoadPilotsReq, ILoadPilotsAns, Pilots_replTable, IPilot,
    LOAD_CHECKPOINTS_CMD, CheckPoint_replTable, ILoadCheckPointsReq, ILoadCheckPointsAns, ICheckPoint
} from "./api/api";
import {getInstantPromise} from "./utils/getInstantPromise";
import {stringAsSql} from "./sql/SqlCore";
import {getValueFromSql, executeSql} from "./sql/MsSqlDb";

export function commonApiResponse(req: express.Request, res: express.Response, next: Function) {
    console.log("api", req.body);

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
        case LOAD_RALLYLEG_CMD:
            ans = LOAD_RALLYLEG_handler(decryptedBody);
            break;
        case LOAD_RALLYPUNKT_CMD:
            ans = LOAD_RALLYPUNKT_handler(decryptedBody);
            break;
        case LOAD_LEGREGISTRATION_CMD:
            ans = LOAD_LEGREGISTRATION_handler(decryptedBody);
            break;
        case LOAD_PILOTS_CMD:
            ans = LOAD_PILOTS_handler(decryptedBody);
            break;
        case LOAD_CHECKPOINTS_CMD:
            ans = LOAD_CHECKPOINTS_handler(decryptedBody);
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
SELECT 
  [Ключ],[Номер],[Название],[Дата],[EngName],[Дата окончания],[Место проведения]
  --(SELECT master.sys.fn_varbintohexstr(max(DBTS)) FROM ReplLog where ReplTable=${replTable}) dbts
FROM 
  [_RallyHeader] where [Текущая гонка]=1
  
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


async function LOAD_RALLYLEG_handler(req: ILoadRallyLegReq): Promise<ILoadRallyLegAns> {
    let replTable = RallyLeg_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;

    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({rallyLeg: undefined});
    else {

        sql = `
SELECT 
  [Ключ],[Номер],[Название],[Дата],[EngName],[Length]
  --(SELECT master.sys.fn_varbintohexstr(max(DBTS)) FROM ReplLog where ReplTable=${replTable}) dbts
FROM 
  [_RallyLeg] where [Текущий этап]=1
  
SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        let row = rows[0][0];
        let dbts = rows[1][0]["dbts"];

        if (row) {
            let rallyLeg: IRallyLeg = {
                id: row["Ключ"],
                num: row["Номер"],
                name: row["Название"],
                date: row["Дата"],
                length: row["Length"],
            };

            return getInstantPromise({rallyLeg: rallyLeg, dbts: dbts});
        }
        else {
            return getInstantPromise({rallyLeg: undefined, dbts: dbts});
        }

    }
}

async function LOAD_RALLYPUNKT_handler(req: ILoadRallyPunktReq): Promise<ILoadRallyPunktAns> {
    let replTable = UsersLink_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable IN (${replTable},${RallyPunkt_replTable}) and DBTS>${req.dbts || "0x00"}`;
    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({rallyPunkt: undefined});
    else {

        sql = `
SELECT 
  _RallyPunkt.Ключ,
  _RallyPunkt.Номер,
  _RallyPunkt.Название,
  _RallyPunkt.Length
    
FROM [_RallyPunkt] 
JOIN _RallyLeg ON _RallyLeg.Ключ=_RallyPunkt._RallyLeg
JOIN _UsersLink ON _UsersLink._RallyPunkt=_RallyPunkt.Ключ
WHERE 
  _UsersLink.Login=${stringAsSql(req.login)} AND
  _RallyLeg.[Текущий этап]=1

SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable IN (${replTable},${RallyPunkt_replTable})  
`;

        let rows = await executeSql(sql);

        console.log("rows", rows);

        let row = rows[0][0];
        let dbts = rows[1][0]["dbts"];

        if (row) {
            let rallyPunkt: IRallyPunkt = {
                id: row["Ключ"],
                num: row["Номер"],
                name: row["Название"],
                length: row["Length"],
            };

            return getInstantPromise({rallyPunkt: rallyPunkt, dbts: dbts});
        }
        else {
            return getInstantPromise({rallyPunkt: undefined, dbts: dbts});
        }

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
  _LegRegistration._Pilots pilotId,
  _LegRegistration.RaceNumber raceNumber,
  _LegRegistration.NPP npp,
  _LegRegistration.StartTime startTime
FROM _LegRegistration 
JOIN _RallyLeg ON _RallyLeg.Ключ=_LegRegistration._RallyLeg
WHERE 
  _RallyLeg.[Текущий этап]=1
ORDER BY 
  _LegRegistration.NPP

SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        console.log("rows", rows);

        let regRows = rows[0];
        let dbts = rows[1][0]["dbts"];

        if (regRows) {
            let legRegistration: ILegRegistration[] = regRows.map((item: any) => {

                return {
                    id: item["id"],
                    pilotId: item["pilotId"],
                    raceNumber: item["raceNumber"],
                    npp: item["npp"],
                    startTime: item["startTime"]
                } as ILegRegistration;

            });

            return getInstantPromise({legRegistration: legRegistration, dbts: dbts});
        }
        else {
            return getInstantPromise({legRegistration: undefined, dbts: dbts});
        }

    }
}

async function LOAD_PILOTS_handler(req: ILoadPilotsReq): Promise<ILoadPilotsAns> {
    let replTable = Pilots_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;
    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({pilots: undefined});
    else {

        sql = `
SELECT Ключ,Имя,EngName,AutoName FROM _Pilots
SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        console.log("rows", rows);

        let pilotsRows = rows[0];
        let dbts = rows[1][0]["dbts"];

        if (pilotsRows) {
            let pilots: IPilot[] = pilotsRows.map((item: any) => {
                return {
                    id: item["Ключ"],
                    name: item["Имя"],
                    engName: item["EngName"],
                    autoName: item["AutoName"]
                } as IPilot;

            });

            return getInstantPromise({pilots: pilots, dbts: dbts});
        }
        else {
            return getInstantPromise({pilots: undefined, dbts: dbts});
        }

    }
}

async function LOAD_CHECKPOINTS_handler(req: ILoadCheckPointsReq): Promise<ILoadCheckPointsAns> {
    let replTable = CheckPoint_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;
    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({checkPoints: undefined});
    else {

        sql = `
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

SELECT master.sys.fn_varbintohexstr(max(DBTS)) dbts FROM ReplLog where ReplTable=${replTable}  
`;

        let rows = await executeSql(sql);

        console.log("rows", rows);

        let checkPointsRows = rows[0];
        let dbts = rows[1][0]["dbts"];

        if (checkPointsRows) {
            let checkpoints: ICheckPoint[] = checkPointsRows.map((item: any) => {
                return {
                    legRegsId: item["_LegRegistration"],
                    rallyPunktId: item["_RallyPunkt"],
                    checkTime: item["CheckTime"],
                    penaltyTime: item["PenaltyTime"],
                    mobileId: item["MobileId"],
                    mobileTime: item["MobileTime"],
                    mobileLogin: item["MobileLogin"],
                    mobileDevice: item["MobileDevice"],
                    syncOk: true
                } as ICheckPoint;

            });

            return getInstantPromise({checkPoints: checkpoints, dbts: dbts});
        }
        else {
            return getInstantPromise({checkPoints: undefined, dbts: dbts});
        }

    }
}