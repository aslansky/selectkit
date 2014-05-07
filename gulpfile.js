'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var header = require('gulp-header');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');

var pkg = require('./package.json');
var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

gulp.task('concat', function() {
  gulp.src('./index.js')
  .pipe(header(banner, {pkg: pkg}))
  .pipe(rename('selectkit.js'))
  .pipe(gulp.dest('./dist'));
});

gulp.task('uglify', function() {
  gulp.src('./index.js')
    .pipe(uglify({
      mangle: {
        except: ['require', 'export']
      }
    }))
    .pipe(rename('selectkit.min.js'))
    .pipe(header(banner, {pkg: pkg}))
    .pipe(gulp.dest('./dist'));
});

gulp.task('scss', function () {
  gulp.src('./style.scss')
    .pipe(sass())
    .pipe(prefix('last 2 version', '> 1%', 'ie 8', 'android 4'))
    .pipe(rename('selectkit.css'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('scss-min', function () {
  gulp.src('./style.scss')
    .pipe(sass())
    .pipe(prefix('last 2 version', '> 1%', 'ie 8', 'android 4'))
    .pipe(minifyCSS())
    .pipe(rename('selectkit.min.css'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function () {
  gulp.watch('./*.scss', ['scss']);
  gulp.watch('./*.js', ['concat']);
});

gulp.task('default', ['concat', 'uglify', 'scss']);
