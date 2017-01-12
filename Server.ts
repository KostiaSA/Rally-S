import * as express from "express";
import * as path from "path";
//import * as logger from "morgan";
import * as favicon from "serve-favicon";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import {commonApiResponse} from "./responses";
import {importFrom1cResponse} from "./1c/importFrom1c";
import {config} from "./config/config";
import {tabloResponse} from "./tablo/tablo";

// Modular Route definitions
//import * as exampleRoute from "./routes/example";

// Error handler service
//import { development as DevelopmentErrorHandler, production as ProductionErrorHandler } from "./services/errorHandler";

// Main app
const app = express();

// view engine setup
//app.set("views", path.join(__dirname, "views"));
//app.set("view engine", "jade");

//app.use(favicon(__dirname + "/public/favicon.ico"));
//app.use(logger("dev"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(config.staticPath)); //serve public files

console.log(__dirname);
// Register routes (as middleware layer through express.Router())
//app.use(exampleRoute);

// app.post('/api', (req: express.Request, res: express.Response, next: Function) => {
//     console.log("api",req.body);
//     res.send('Это api !');
// });

app.post('/api', commonApiResponse);
app.post('/api/export', importFrom1cResponse);
//app.post('/api/import', exportTo1cResponse);
app.get('/tablo', tabloResponse);


// catch 404 and forward to error handler
app.use((req: express.Request, res: express.Response, next: Function) => {
    let err = new Error("Not Found");
    res.status(404);
    console.log("catching 404 error");
    return next(err);
});


app.set("port", config.port);

app.listen(app.get("port"), () => {
    console.log("Express server listening on port " + config.port);
}).on("error", err => {
    console.log("Cannot start server, port most likely in use");
    console.log(err);
});
