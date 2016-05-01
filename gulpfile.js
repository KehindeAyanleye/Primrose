﻿var gulp = require("gulp"),
  babel = require("gulp-babel"),
  concat = require("gulp-concat"),
  cssmin = require("gulp-cssmin"),
  data = require("gulp-data"),
  fs = require("fs"),
  jshint = require("gulp-jshint"),
  pkg = require("./package.json"),
  pliny = require("pliny"),
  pug = require("gulp-pug"),
  recurseDirectory = require("./server/recurseDirectory"),
  rename = require("gulp-rename"),
  uglify = require("gulp-uglify"),
  pathX = /.*\/(.*).js/,
  pugFileSpec = ["*.jade", "doc/**/*.jade"],
  sourceFiles = recurseDirectory("src"),
  headerFiles = [
    "node_modules/logger/logger.js",
    "lib/loggerInit.js",
    "lib/promise.js",
    "lib/Element.details.js",
    "node_modules/pliny/pliny.js",
    "lib/sha512.js",
    "node_modules/socket.io-client/socket.io.js",
    "node_modules/three/three.js",
    "node_modules/three/examples/js/loaders/OBJLoader.js",
    "node_modules/three/examples/js/loaders/MTLLoader.js"
  ],
  mainPageFiles = [
    "lib/ga-snippet.js",
    "node_modules/autotrack/autotrack.js"
  ],
  headerSpec = /(?:\b(\d+)\r\n\s*)?h1 ([^\r\n]+)/,
  docFiles = recurseDirectory("doc")
    .filter(function (f) { return /.jade$/.test(f); })
    .map(function (f, i) {
      var file = fs.readFileSync(f, "utf-8").toString(),
        match = file.match(headerSpec),
        index = i;
      if (match) {
        if (match[1]) {
          index = parseInt(match[1]);
        }

        var obj = {
          fileName: f.replace(/\\/g, "/").replace(/\.jade$/, ""),
          index: index,
          title: match[2],
          incomplete: /\[under construction\]/.test(file),
          tutorial: /^Tutorial:/.test(match[2]),
          example: /^Example:/.test(match[2])
        };

        return obj;
      }
    }).filter(function (f) {
      return f;
    }),
  debugDataES6 = {
    debug: true,
    jsExt: ".js",
    cssExt: ".css",
    frameworkFiles: headerFiles.concat(sourceFiles)
  },
  debugDataES5 = JSON.parse(JSON.stringify(debugDataES6));

docFiles.sort(function (a, b) {
  return a.index - b.index;
});

debugDataES5.frameworkFiles = debugDataES5.frameworkFiles.map(function (f) {
  return f.replace(/^src\//, "es5/");
});

function pugConfiguration(options, defaultData) {
  var destination = ".",
    size = (fs.lstatSync("Primrose.js").size / 1000).toFixed(1),
    minifiedSize = (fs.lstatSync("Primrose.min.js").size / 1000).toFixed(1);
  return gulp.src(pugFileSpec, { base: "./" })
    .pipe(rename(function (path) {
      path.extname = "";
      return path;
    }))
    .pipe(data(function (file, callback) {
      var name = file.path.replace(/\\/g, "/"),
        parts = name.split("/")
          .map(function () {
            return "../";
          }),
        shortName = name.match(/([^\/]+)\.html$/),
        scriptName = name.replace(/\.html$/, "/app.js");

      parts.pop();

      var exists = fs.existsSync(scriptName);
      txt = exists && fs.readFileSync(scriptName, "utf-8");

      callback(null, {
        debug: defaultData.debug,
        version: pkg.version,
        cssExt: defaultData.cssExt,
        jsExt: defaultData.jsExt,
        filePath: name,
        fileRoot: parts.join(""),
        fileName: shortName && shortName[1],
        sizeKB: size,
        sizeMinKB: minifiedSize,
        docFiles: docFiles,
        frameworkFiles: defaultData.frameworkFiles,
        demoScriptName: scriptName,
        demoScript: exists && ("grammar(\"JavaScript\");\n" + txt)
      });
    }))
    .pipe(pug(options))
    .pipe(gulp.dest(destination));
}

gulp.task("jshint", function () {
  return gulp.src(sourceFiles)
    .pipe(jshint({
      multistr: true,
      esnext: true
    }));
});

gulp.task("pug:release", ["archive"], function () {
  return pugConfiguration({}, {
    jsExt: ".min.js",
    cssExt: ".min.css"
  });
});

gulp.task("pug:debug:es5", function () {
  return pugConfiguration({ pretty: true }, debugDataES5);
});

gulp.task("pug:debug:es6", function () {
  return pugConfiguration({ pretty: true }, debugDataES6);
});

gulp.task("cssmin", function () {
  gulp.src(["doc/**/*.css", "stylesheets/**/*.css", "!**/*.min.css"], { base: "./" })
    .pipe(cssmin())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("./"));
});

gulp.task("babel", function () {
  var destination = "./es5";
  return gulp.src("src/**/*.js", { base: "./src" })
    .pipe(babel({
      sourceMap: false,
      presets: ["es2015"]
    }))
    .pipe(gulp.dest(destination));
});

function concatenate(stream, name) {
  return stream
    .pipe(concat(name + ".js", { newLine: "\n" }))
    .pipe(gulp.dest("./"));
}

gulp.task("concat:primrose", function () {
  return concatenate(gulp.src(sourceFiles)
    .pipe(babel({
      sourceMap: false,
      presets: ["es2015"]
    })), "Primrose");
});

gulp.task("carveDocumentation", ["concat:primrose"], function (callback) {
  pliny.carve("Primrose.js", "PrimroseDocumentation.js", function () {
    console.log("done");
    callback();
  });
});

gulp.task("concat:payload", function () {
  return concatenate(gulp.src(headerFiles), "PrimroseDependencies");
});

gulp.task("concat:marketing", function () {
  return concatenate(gulp.src(mainPageFiles), "PrimroseSite");
});

gulp.task("jsmin", ["carveDocumentation", "concat:payload", "concat:marketing"], function () {
  return gulp.src(["Primrose*.js", "!*.min.js"])
    .pipe(rename({ suffix: ".min" }))
    .pipe(uglify())
    .pipe(gulp.dest("./"));
});


gulp.task("archive", ["jsmin"], function () {
  return gulp.src(["Primrose*.js", "!PrimroseSite*", "!PrimroseDependencies*"])
    .pipe(rename(function (file) {
      if (file.basename.indexOf(".min") > -1) {
        file.extname = ".min.js";
        file.basename = file.basename.substring(0, file.basename.length - 4);
      }
      file.basename += "-" + pkg.version;
      return file;
    }))
    .pipe(gulp.dest("archive"));
});

gulp.task("default", ["pug:debug:es6"]);
gulp.task("debug", ["pug:debug:es6"]);
gulp.task("stage", ["babel", "pug:debug:es5"]);
gulp.task("release", ["cssmin", "pug:release"]);