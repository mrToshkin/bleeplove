const { src, dest, watch, series, parallel } = require('gulp'),
      ghPages = require('gulp-gh-pages'),
      del = require('del'),
      autoprefixer = require('gulp-autoprefixer'),
      babel = require('gulp-babel'),
      cache = require('gulp-cache'),
      cheerio = require('gulp-cheerio'),
      concat = require('gulp-concat'),
      csscomb = require('gulp-csscomb'),
      csso = require('gulp-csso'),
      imagemin = require('gulp-imagemin'),
      squoosh = require("gulp-squoosh"),
      plumber = require('gulp-plumber'),
      rename = require('gulp-rename'),
      replace = require('gulp-replace'),
      sass = require('gulp-sass')(require('node-sass')),
      sourcemaps = require('gulp-sourcemaps'),
      svgmin = require('gulp-svgmin'),
      svgstore = require('gulp-svgstore'),
      gulpWebp = require('gulp-webp'),
      imgCompress  = require('imagemin-jpeg-recompress'),
      uglify = require('gulp-uglify');

const commonScssPipes = (source) => (
  src(source)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(csscomb())
    .pipe(dest('./build/css'))
    .pipe(replace('/*! normalize.css', '/* normalize.css'))
    .pipe(csso())
    .pipe(sourcemaps.write())
);

const scssDev = () => (
  commonScssPipes('./src/scss/styles.scss')
    .pipe(rename('styles.min.css'))
    .pipe(dest('./build/css'))
);

const scss = () => (
  src('./src/scss/styles.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(autoprefixer({
      overrideBrowserslist:  ['last 3 versions'],
      cascade: false
    }))
    .pipe(csscomb())
    .pipe(dest('./build/css'))
    .pipe(replace('/*! normalize.css', '/* normalize.css'))
    .pipe(csso())
    .pipe(rename('styles.min.css'))
    .pipe(dest('./build/css'))
);

const js = () => (
  src('./src/scripts/*.js')
    .pipe(babel({ presets: ['@babel/env'] }))
    .pipe(concat('script.min.js'))
    .pipe(uglify({ toplevel: true }))
    .pipe(dest('./build/scripts'))
);

const commonImgPipes = (source, base) => (
  src(source, base)
    .pipe(cache(imagemin([
      imgCompress({
        loops: 4,
        min: 70,
        max: 80,
        quality: 'high',
        progressive: true
      }),
      imagemin.mozjpeg(),
      imagemin.optipng(),
      imagemin.svgo()
    ])))
)

const imgReleases = () => (
  commonImgPipes('./src/releases/**/*.{png,jpg,webp}', { base: './src/releases' })
    .pipe(dest('./build/releases'))
);

const imgReleasesResize = () => (
  src('./src/releases/**/*.{png,jpg,webp}', { base: './src/releases' })
    .pipe(squoosh(() => ({
      preprocessOptions: {
        resize: {
          width: 160,
          height: 160,
        },
      },
      encodeOptions: {
        mozjpeg: {},
      }
    })))
    .pipe(rename({ suffix: '--small' }))
    .pipe(dest('./build/releases'))
);
const img = () => (
  commonImgPipes('./src/img/**/*.{png,jpg,webp,ico}', { base: './src/img' })
    .pipe(dest('./build/img'))
);
const webp = () => (
  src('./src/img/**/*.{png,jpg}', {base: './src/img'})
    .pipe(gulpWebp({quality: 80}))
    .pipe(dest('./build/img'))
);
const svg = () => (
  src('./src/img/svg/*.svg')
    .pipe(svgmin({js2svg:{pretty: true}}))
    /* .pipe(cheerio({ run: function ($) {
        $('[fill]').removeAttr('fill');
        $('[stroke]').removeAttr('stroke');
        $('[style]').removeAttr('style');
      },parserOptions: {xmlMode: true}})) */
    .pipe(replace('&gt;', '>'))
    .pipe(dest('./build/img/svg'))
);
const sprite = () => (
  src('./src/img/svg/icons/**/*.svg')
    .pipe(svgmin({js2svg:{pretty: true}}))
    .pipe(cheerio({ run: function ($) {
        $('[fill]').removeAttr('fill');
        $('[stroke]').removeAttr('stroke');
        $('[style]').removeAttr('style');
      },parserOptions: {xmlMode: true}}))
    .pipe(replace('&gt;', '>'))
    .pipe(svgstore({inLineSvg: true}))
    .pipe(rename('sprite.svg'))
    .pipe(dest('./build/img/svg'))
);
const spriteSocial = () => (
  src('./src/img/svg/social-icons/**/*.svg')
    .pipe(svgmin({js2svg:{pretty: true}}))
    .pipe(replace('&gt;', '>'))
    .pipe(svgstore({inLineSvg: true}))
    .pipe(rename('sprite-social.svg'))
    .pipe(dest('./build/img/svg'))
);

const fonts = () => (
  src('./src/fonts/**')
    .pipe(dest('./build/fonts'))
);
const cleanImg = () => del(['./build/img', './build/releases/**/*.{png,jpg,webp}']);
const cleanBuild = () => (
  del([
    './build/css',
    './build/scripts'
  ])
);
const cleanFonts = () => del('./build/fonts');

const watcher = () => {
  watch('./src/**/*.scss', series(scssDev));
  watch('./src/scripts/*.js', series(js));
  watch('./src/fonts/**', series(fonts));
};

exports.optimg = optimg = series(cleanImg, img, imgReleases, imgReleasesResize, webp, svg, sprite, spriteSocial);
const clearAll = parallel(cleanImg, cleanBuild, cleanFonts)
const dev = series(clearAll, parallel(optimg, scssDev, fonts, js));
exports.build = series(clearAll, parallel(optimg, fonts, scss, js));
exports.deploy = () => src('./build/**/*').pipe(ghPages());
exports.default = series(dev, watcher);
