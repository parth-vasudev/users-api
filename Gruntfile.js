module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    paths: {
      dist: './dist',
      npmCache: './npm_cache',
      packageName: '<%= pkg.name %>_<%= pkg.version %>_all.deb',
      package: '<%= paths.dist %>/<%= paths.packageName %>',
    },
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default');
};
