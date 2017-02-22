import * as fs from "fs";
import {importFrom1c} from "../1c/importFrom1c";
import {importFrom1cPenal} from "../1c/importFrom1c-penal";

function testImportFrom1cPenal() {

    let text = fs.readFileSync("C:/Rally/importFrom1c_qawlu9ladk.json", "utf8").replace(/^\uFEFF/, "");

    var obj = JSON.parse(text);

    console.log(obj);


    importFrom1cPenal(obj)
        .then(() => {
            console.log("testImportFrom1cPenal: Ok");
            process.exit();
        })
        .catch((e: any) => {
            console.error("testImportFrom1cPenal:", e);
            process.exit(1);
        });
}


testImportFrom1cPenal();