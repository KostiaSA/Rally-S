import * as fs from "fs";
import {importFrom1c} from "../1c/importFrom1c";

function testImportFrom1c() {

    let text = fs.readFileSync("C:/Rally/выгрузка2.json", "utf8").replace(/^\uFEFF/, "");

    var obj = JSON.parse(text);

    console.log(obj);


    importFrom1c(obj)
        .then(() => {
            console.log("testImportFrom1c: Ok");
            process.exit();
        })
        .catch((e: any) => {
            console.error("testImportFrom1c:", e);
            process.exit(1);
        });
}


testImportFrom1c();