
module.exports = function runGrunt(grunt) {
  'use strict';

  var ALL_FILES = [ 'Gruntfile.js', 'lib/**/*.js' ],
      JSHINT_OPTIONS = {
        curly: true,
        eqeqeq: true,
        forin: true,
        immed: true,
        latedef: true,
        noarg: true,
        node: true,
        strict: false,
        undef: true,
        unused: true,

        globals: {
          afterEach: false,
          beforeEach: false,
          describe: false,
          expect: false,
          it: false,
          jasmine: false,
          runs: false,
          waitsFor: false
        }
      };

  grunt.initConfig({
    jshint: {
      files: ALL_FILES,
      options: JSHINT_OPTIONS
    },
    watch: {
      files: ALL_FILES,
      tasks: ['jshint']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
