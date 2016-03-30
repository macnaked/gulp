var gulp = require('gulp'),
	concatCSS = require('gulp-concat-css'),
	rename = require('gulp-rename'),
	notify = require('gulp-notify'),
	minifyCSS = require('gulp-minify-css'),
	autoprefixer = require('gulp-autoprefixer'),
	sass = require('gulp-sass'),
	uncss = require('gulp-uncss'),
	cachebust = require('gulp-cache-bust'),
	inject = require('gulp-inject'),
	useref = require('gulp-useref'),
    gulpif = require('gulp-if'),
    clean = require('gulp-clean'),
    uglify = require('gulp-uglify'),
    runSequence = require('run-sequence'),
    connect = require('gulp-connect'),
    watch = require('gulp-watch'),
    livereload = require('gulp-livereload'),
    sourcemaps = require('gulp-sourcemaps'),
    spritesmith = require('gulp.spritesmith'),
    merge = require('merge-stream'),
    rimraf = require('gulp-rimraf'),
    rebaseUrls = require('gulp-css-rebase-urls'),
    rebase = require('gulp-css-url-rebase'),
    flatten = require('gulp-flatten'),
    replace = require('gulp-replace-path'),
    pngquant = require('imagemin-pngquant'),
    imagemin = require('gulp-imagemin'),
    fontgen = require('gulp-fontgen');

var config = {
  outputFolder: '../dist',
  imagesFolder: 'img',
  cssFolder: 'css',
  jsFolder: 'js'
}


// test
gulp.task('test', function () {
	return gulp.src('_test/**/*.{ttf,otf}')
			    .pipe(fontgen({
			      dest: "_test/font1/"
			    }));
});

// build:css
gulp.task('build:css', function() {
  return gulp.src(config.outputFolder + '/' + config.cssFolder + '/*.css')
  	// .pipe(concatCSS('main.css'))
  	/*.pipe(uncss({
        html: [config.outputFolder + '/*.html']
    }))*/
  	.pipe(autoprefixer({browsers: ['last 2 versions', '> 1%', 'ie 9'], cascade: false}))
  	.pipe(minifyCSS())
  	// .pipe(rename('main.min.css'))
  	.pipe(gulp.dest(config.outputFolder + '/' + config.cssFolder));
});

// replace:urls
gulp.task('replace:urls', function () {
	return gulp.src(config.outputFolder + '/' + config.cssFolder + '/vendors*.css')
				.pipe(replace(/url\s*\(\s*[\'|\"]*\s*.*?([^\/]+?\.(?:png|jpg|jpeg|gif))\s*[\'|\"]*\s*\)/gi, 'url\(../img/vendors/$1\)'))
				.pipe(gulp.dest(config.outputFolder + '/' + config.cssFolder));
});

// concat:css:js
gulp.task('concat:css:js', function() {
    return gulp.src('*.html')
        .pipe(useref())
        .pipe(gulp.dest(config.outputFolder));
});

// build:html
gulp.task('build:html', function () {
	return gulp.src(config.outputFolder + '/*.html')
		       .pipe(cachebust({
				    type: 'timestamp'
			    }))
			    .pipe(gulp.dest(config.outputFolder));
});

// build:js
gulp.task('build:js', function() {
  return gulp.src(config.outputFolder + '/' + config.jsFolder + '/*.js')
    .pipe(uglify())
    .pipe(gulp.dest(config.outputFolder + '/' + config.jsFolder));
});

// copy:images
gulp.task('copy:images', function () {
	gulp.src('plugins/**/*.{jpg,jpeg,png,gif}')
		.pipe(flatten())
		.pipe(gulp.dest(config.outputFolder + '/' + config.imagesFolder + '/vendors/'));

	gulp.src('media/pics/**/*.{jpg,jpeg,png,gif}')
		.pipe(gulp.dest(config.outputFolder + '/media/pics/'));

  gulp.src(config.imagesFolder + '/_repeated/**/*.{jpg,jpeg,png,gif}')
    .pipe(gulp.dest(config.outputFolder + '/' + config.imagesFolder + '/_repeated/'));

	return gulp.src(config.imagesFolder + '/sprite*.png')
				.pipe(gulp.dest(config.outputFolder + '/' + config.imagesFolder));
});

// minify:images
gulp.task('minify:images', ['copy:images'], function () {
	return gulp.src(config.outputFolder + '/' + config.imagesFolder + '/**/*.{jpg,jpeg,png}')
		.pipe(imagemin({
			progressive: true,
			use: [pngquant()]
		}))
		.pipe(gulp.dest(config.outputFolder + '/' + config.imagesFolder));
});

// copy:fonts
gulp.task('copy:fonts', function () {
	gulp.src('plugins/**/*/fonts/**/*')
		.pipe(flatten())
		.pipe(gulp.dest(config.outputFolder + '/fonts/'));

	return gulp.src('fonts/**/*')
				.pipe(gulp.dest(config.outputFolder + '/fonts/'));
});

// build
gulp.task('build', function () {
	runSequence('clean', 'concat:css:js', 'replace:urls', 'build:css', /*'build:js',*/ 'build:html', 'minify:images', 'copy:fonts');
});




// sass
gulp.task('sass', function() {
  gulp.src(config.cssFolder + '/**/*.scss')
  	.pipe(sourcemaps.init())
  	.pipe(sass().on('error', sass.logError))
  	.pipe(sourcemaps.write('./'))
    .pipe(rename('main.css'))
  	.pipe(gulp.dest(config.cssFolder));

});

// watch:sass
gulp.task('watch:sass', function () {
	gulp.watch(config.cssFolder + '/**/*.scss', ['sass']);
});

// clean:sprite
gulp.task('clean:sprite', function () {
  return gulp.src(config.imagesFolder + '/sprite*.png', {read: false})
  		.pipe(rimraf());
});

// build:sprite
gulp.task('build:sprite', ['clean:sprite'], function() {
  // create new sprite
  var spriteData = gulp.src([config.imagesFolder + '/**/*.{jpg,jpeg,png}', '!' + config.imagesFolder + '/_repeated/*'])
  		.pipe(spritesmith({
    imgName: '../' + config.imagesFolder + '/sprite.png',
    cssName: '_sprite.scss',
    // retinaSrcFilter: [config.imagesFolder + '/**/*@2x.png'],    // number of RETINA images must be the same as number of normal images
    // retinaImgName: '../' + config.imagesFolder + '/sprite@2x.png'    // size of RETINA images must be 2x bigger than size of normal images
  }));
  var cssStream = spriteData.css.pipe(gulp.dest(config.cssFolder));
  var imgStream = spriteData.img.pipe(gulp.dest(config.imagesFolder));

  return merge(imgStream, cssStream);
});

// watch:images
gulp.task('watch:images', function () {
	gulp.watch([config.imagesFolder + '/**/*.{jpeg,jpg,png}', 'plugins/**/*.{jpeg,jpg,png}', '!' + config.imagesFolder + '/_repeated/*'], ['build:sprite']);
});

// watch
gulp.task('watch', ['watch:sass', 'watch:images']);




// inject:plugins
gulp.task('inject:plugins', function () {
	return gulp.src('*.html')
	// css
   .pipe(inject(gulp.src('plugins/bootstrap-3.3.6-dist/css/bootstrap.css', {read: false}), {starttag: '<!-- inject:bootstrap.css -->', relative: true}))
   // .pipe(inject(gulp.src('plugins/jquery-ui-1.11.2/jquery-ui.min.css', {read: false}), {starttag: '<!-- inject:jquery-ui.css -->', relative: true}))
   .pipe(inject(gulp.src(['plugins/**/*.css', '!plugins/bootstrap-3.3.6-dist/css/bootstrap.css', '!plugins/jquery-ui-1.11.2/jquery-ui.min.css'], {read: false}), {relative: true}))
   .pipe(inject(gulp.src(config.cssFolder + '/main.css', {read: false}), {starttag: '<!-- inject:main.css -->', relative: true}))
   // js
   .pipe(inject(gulp.src(['plugins/jquery-1.10.2/jquery-1.10.2.min.js'], {read: false}), {starttag: '<!-- inject:jquery.js -->', relative: true}))
   // .pipe(inject(gulp.src(['plugins/jquery-ui-1.11.2/jquery-ui.min.js'], {read: false}), {starttag: '<!-- inject:jquery-ui.js -->', relative: true}))
   .pipe(inject(gulp.src(['plugins/bootstrap-3.3.6-dist/js/bootstrap.min.js'], {read: false}), {starttag: '<!-- inject:bootstrap.js -->', relative: true}))
   .pipe(inject(gulp.src(['plugins/**/*.js', '!plugins/jquery-1.10.2/jquery-1.10.2.min.js', '!plugins/jquery-ui-1.11.2/jquery-ui.min.js', '!plugins/bootstrap-3.3.6-dist/js/bootstrap.min.js'], {read: false}), {relative: true}))
   .pipe(inject(gulp.src([config.jsFolder + '/project/**/*.js', '!js/main.js'], {read: false}), {starttag: '<!-- inject:project:js -->', relative: true}))
   .pipe(inject(gulp.src([config.jsFolder + '/main.js'], {read: false}), {starttag: '<!-- inject:main.js -->', relative: true}))
   .pipe(gulp.dest(''));
});




// clean
gulp.task('clean', function () {
    return gulp.src(config.outputFolder + '/*', {read: false})
        .pipe(clean({force: true}));
});



gulp.task('default', function () {
  process.stdout.write('Commands for this project:\n');
  process.stdout.write('gulp watch\n');
  process.stdout.write('gulp build\n');
  process.stdout.write('gulp inject:plugins\n');
});
