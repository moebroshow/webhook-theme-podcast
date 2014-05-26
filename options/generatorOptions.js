var fs = require('fs');
var url = require('url');
var header = require('connect-header');

module.exports = function(grunt) {

  var conf = {};

  try {
    conf = grunt.file.readJSON('./.firebase.conf');
  } catch (err) {
    conf = {};
  }

  var oldConfig = grunt.config.data;
  
  var mergeConfig = {
    webhook: conf,

    open : {
      'wh-open': {
        path: 'http://localhost:2002/'
      }
    },

    connect: {
      'wh-server': {
        options: {
          port: 2002,
          hostname: '*',
          base: '.build',
          livereload: 35730,
          middleware: function(connect, options) {
            // Return array of whatever middlewares you want
            return [
              header({ 'X-Webhook-Local' : true }),
              connect.static(options.base),
              require('grunt-connect-proxy/lib/utils').proxyRequest,
              function(req, res, next) {
                if ('GET' != req.method && 'HEAD' != req.method) return next();

                var contents = fs.readFileSync('./libs/debug404.html');
                res.end(contents);
              },
            ];
          }
        },
        proxies: [
            {
                context: '/webhook-uploads',
                host:  conf.siteName + '.webhook.org',
                port: 80,
                changeOrigin: true,
                headers: {
                  host: conf.siteName + '.webhook.org'
                }
            }
        ]
      }
    },

    watch: {
      'wh-watch': {
        files: ['pages/**/*', 'templates/**/*', 'static/**/*'],
        tasks: ['build']
      }
    },

    concurrent: {
      options: {
        logConcurrentOutput: true
      },
      "wh-concurrent": {
        tasks: ["watch", "webListener-open"]
      }
    },

    // Compile static assets into .whdist/static
    // Copy pages/html files into .whdist/pages and .whdist/html
    // Run rev on .whdist/static and then run usemin on .whdist/pages and .whdist/html
    // Copy unmodified static folder into .whdist/static

    useminPrepare: {
      src: ['.whdist/pages/**/*.html', '.whdist/templates/**/*.html'],
      options: {
        root: '.',
        dest: '.whdist'
      }
    },

    rev: {
      assets: {
        files: [{
          src: [
            '.whdist/static/**/*.{js,css}',
          ]
        }]
      }
    },

    usemin: {
      html: ['.whdist/pages/**/*.html', '.whdist/templates/**/*.html'],
      options: {
        assetsDirs: ['.whdist']
      }
    }
  };

  for(var key in mergeConfig) {
    if(oldConfig[key]) {
      var oldData = oldConfig[key];
      grunt.util._.extend(oldData, mergeConfig[key]);
      oldConfig[key] = oldData;
    } else {
      oldConfig[key] = mergeConfig[key];
    }
  }

  grunt.initConfig(oldConfig);
  
  grunt.loadNpmTasks('grunt-simple-watch');
  grunt.loadNpmTasks('grunt-rev');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-connect-proxy');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-usemin');
};