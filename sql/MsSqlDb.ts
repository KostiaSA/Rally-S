import * as sql from "mssql"
import {
    sqlServerAddress, sqlServerPort, sqlLogin, sqlPassword,
    sqlServerInstance, sqlDatabase
} from "./SqlConnections";

export async function getValueFromSql(sqlBatch: string, columnName: string): Promise<any> {
    return executeSql(sqlBatch).then((rows)=> {
        return rows[0][0][columnName];
    });
}

export async function executeSql(sqlBatch: string): Promise<any> {
    let options = {instanceName: sqlServerInstance} as any;

    let config: sql.config = {
      //  driver: "msnodesqlv8",
        pool: {
            min: 5,
            max: 50,
            idleTimeoutMillis: 5000 /// не работает
        },
        server: sqlServerAddress,
        port: sqlServerPort,
        user: sqlLogin,
        database: sqlDatabase,
        password: sqlPassword,
        options: options,
        connectionTimeout:5000,
        requestTimeout:0
    }

    let connection = new sql.Connection(config);

    return connection
        .connect()
        .then(()=> {
            let req = new sql.Request(connection);
            req.multiple = true;
            return req.batch(sqlBatch);
        })
        .then((rowsSet: any)=> {
            //console.dir(rowsSet);
            return rowsSet;
        });

}
