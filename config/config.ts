export interface IConfig {
    sqlServerAddress: string;
    sqlServerInstance: string;
    sqlServerPort: number;
    sqlLogin: string;
    sqlPassword: string;
    sqlDatabase: string;
    port:number;
    staticPath:string;
}

// let developDir: IConfig = {
//     sqlServerAddress: "car",
//     sqlServerInstance: "",
//     sqlServerPort: 1433,
//     sqlLogin: "sa",
//     sqlPassword: "sonyk",
//     sqlDatabase: "Rally",
// }

let cloudDir: IConfig = {
    sqlServerAddress: "online.bajarussia.com",
    sqlServerInstance: "",
    sqlServerPort: 1433,
    sqlLogin: "sa",
    sqlPassword: "12KloP09",
    sqlDatabase: "Rally",
    port:3000,
    staticPath:"c:/rally/a/www"
}


export let config :IConfig = cloudDir;