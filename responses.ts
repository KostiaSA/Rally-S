import * as express from "express";
import crypto = require("crypto-js");
import {
    GET_ENCRYPT_KEY_CMD, LOGIN_CMD, IReq, IGetEncryptKeyReq, IGetEncryptKeyAns, IAns, ILoginReq,
    ILoginAns, BAD_LOGIN_PASSWORD, LOAD_RALLYHEADER_CMD, ILoadRallyHeaderReq, ILoadRallyHeaderAns,
    RallyHeader_replTable, IRallyHeader
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
        return getInstantPromise({user:fio});
    else
        return getInstantPromise({error: BAD_LOGIN_PASSWORD, user:""});

}

async function LOAD_RALLYHEADER_handler(req: ILoadRallyHeaderReq): Promise<ILoadRallyHeaderAns> {
    let replTable=RallyHeader_replTable;

    let sql = `select count(1) cnt from ReplLog where ReplTable=${replTable} and DBTS>${req.dbts || "0x00"}`;

    let count = await getValueFromSql(sql, "cnt");

    if (count === 0)
        return getInstantPromise({rallyHeader: undefined});
    else {

        sql = `
SELECT 
  [Ключ],[Номер],[Название],[Дата],[EngName],[Дата окончания],[Место проведения],
  (SELECT master.sys.fn_varbintohexstr(max(DBTS)) FROM ReplLog where ReplTable=${replTable}) dbts
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