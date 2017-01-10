export interface IConfig {
    sqlServerAddress: string;
    sqlServerInstance: string;
    sqlServerPort: number;
    sqlLogin: string;
    sqlPassword: string;
    sqlDatabase: string;
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
}


export let config :IConfig = cloudDir;