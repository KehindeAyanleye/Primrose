module.exports = function ( grunt ) {
  // Project configuration.
  var banner = "/*\n\
  <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today(\"yyyy-mm-dd\") %>\n\
  <%= pkg.license.type %>\n\
  Copyright (C) 2015 <%= pkg.author %>\n\
  <%= pkg.homepage %>\n\
  <%= pkg.repository.url %>\n\
*/\n";
  grunt.initConfig( {
    pkg: grunt.file.readJSON( "package.json" ),
    clean: {
      default: [ "dist/" ]
    },
    exec: {
      build_THREE: "cd ../three.js/utils/build && build.bat",
      build_Heather: "cd ../Heather && grunt"
    },
    copy: {
      copy_THREE: {
        files: [
          { expand: true, flatten: true, src: [ '../three.js/build/*' ],
            dest: 'lib/', filter: 'isFile' }
        ]
      },
      copy_Heather: {
        files: [
          { expand: true, flatten: true, src: [ '../Heather/dist/*' ],
            dest: 'lib/', filter: 'isFile' }
        ]
      }
    },
    jshint: {
      default: [ "core.js", "src/**/*.js" ]
    },
    concat: {
      options: {
        banner: banner,
        separator: ";",
        footer: "Primrose.VERSION = \"v<%= pkg.version %>\";"
      },
      default: {
        files: {
          "dist/Primrose.js": [ "core.js", "src/**/*.js" ]
        }
      }
    },
    uglify: {
      options: {
        banner: banner
      },
      default: {
        files: [ {
            src: "dist/Primrose.js",
            dest: "dist/Primrose.min.js"
          } ]
      }
    }
  } );

  grunt.loadNpmTasks( "grunt-contrib-clean" );
  grunt.loadNpmTasks( "grunt-exec" );
  grunt.loadNpmTasks( "grunt-contrib-copy" );
  grunt.loadNpmTasks( "grunt-contrib-jshint" );
  grunt.loadNpmTasks( "grunt-contrib-concat" );
  grunt.loadNpmTasks( "grunt-contrib-uglify" );

  grunt.registerTask( "default", [ "clean", "exec", "copy", "jshint", "concat",
    "uglify" ] );

};
