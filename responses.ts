import * as express from "express";
import crypto = require("crypto-js");
import {
    GET_ENCRYPT_KEY_CMD, LOGIN_CMD, IReq, IGetEncryptKeyReq, IGetEncryptKeyAns, IAns, ILoginReq,
    ILoginAns, BAD_LOGIN_PASSWORD
} from "./api/api";
import {getInstantPromise} from "./utils/getInstantPromise";
import {stringAsSql} from "./sql/SqlCore";
import {getValueFromSql} from "./sql/MsSqlDb";

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
        default:
            ans = getInstantPromise({error: "invalid api command"});
    }

    ans.then((ansObj: any)=> {
        res.send(JSON.stringify(ansObj));
    })

}

function getEncryptKeyFromSessionId(sessionId: string): string {
    return crypto.MD5("xeedtt" + sessionId+"gdfdtr55").toString().substr(2,32);
}


// function GET_ENCRYPT_KEY_handler(req: IGetEncryptKeyReq): IGetEncryptKeyAns {
//     return ({encryptKey: "key123"})
// }

async function LOGIN_handler(req: ILoginReq): Promise<ILoginAns> {

    let sql = `SELECT ISNULL((SELECT [Password] FROM _Users WHERE [Login]=${stringAsSql(req.login)}),'ujfgff74hdr4wio3645hfdt') Password`;

    console.log("sql",sql);

    let pass = await getValueFromSql(sql, "Password");

    console.log("pass",pass);

    if (req.password === pass)
        return getInstantPromise({});
    else
        return getInstantPromise({error: BAD_LOGIN_PASSWORD});

}