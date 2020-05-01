"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loader_utils_1 = require("loader-utils");
const sharp_1 = __importDefault(require("sharp"));
const imageToString = function (image) {
    // For requires from CSS when used with webpack css-loader,
    // outputting an Object doesn't make sense,
    // So overriding the toString method to output just the URL
    const image_src = `__webpack_public_path__ + ${JSON.stringify(image.src)}`;
    return `module.exports = {
		src: ${image_src},
		width:  ${JSON.stringify(image.width)},
		height:  ${JSON.stringify(image.height)},
		type:  ${JSON.stringify(image.type)},
		${image.placeholder ? `placeholder: ${JSON.stringify(image.placeholder)},` : ''}
		${image.responsive_images
        ? `responsive_images: ${JSON.stringify(image.responsive_images).replace(/"src"\:/g, '"src": __webpack_public_path__ + ')},`
        : ''}
		};
		module.exports.toString = function() {
			return ${image_src};
		};`;
};
const format_options = {
    jpeg: { quality: 85, chromaSubsampling: '4:4:4' },
    webp: { quality: 85 },
    png: {}
};
const file_extensions = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
    'svg+xml': 'svg'
};
const loader = function (content) {
    this.cacheable && this.cacheable(true);
    this.addDependency(this.resourcePath);
    const options = loader_utils_1.getOptions(this) || {};
    const { name_prefix = '[name]', target_formats = ['webp', 'jpeg'], widths = [1280, 640], emitFile = true } = options;
    const default_format = target_formats.indexOf('jpeg') > -1 ? 'jpeg' : target_formats[0];
    const getImageSource = (filename_suffix = '[ext]', buffer) => {
        return loader_utils_1.interpolateName(this, name_prefix + '.' + filename_suffix, {
            context: options.context || this.rootContext || this.context,
            content: buffer || content,
            regExp: options.regExp
        });
    };
    if (typeof content === 'string') {
        throw new Error('This is a raw loader - content should not be a string');
    }
    else {
        const callback = this.async();
        const image = sharp_1.default(content);
        image
            .metadata()
            .then(metadata => {
            const source_dimensions = {
                width: metadata.width || -1,
                height: metadata.height || -1
            };
            if (!metadata.format || metadata.format === 'svg') {
                const src = getImageSource();
                emitFile && this.emitFile(src, content, null);
                // no resizing required - we are done
                callback && callback(null, imageToString(Object.assign(Object.assign({}, source_dimensions), { src, type: 'image/svg+xml' })));
            }
            else {
                // should come from options
                let target_widths = widths.filter(width => width < source_dimensions.width);
                target_widths.push(source_dimensions.width);
                target_widths = target_widths.sort((a, b) => a - b);
                const promises = [];
                target_formats.forEach(format => {
                    target_widths.forEach(width => {
                        promises.push(image
                            .toFormat(format, format_options[format])
                            .resize(width)
                            .toBuffer()
                            .then(buffer => {
                            return {
                                buffer,
                                width,
                                format,
                                src: getImageSource(`${width}.${file_extensions[format]}`, buffer),
                                is_default: format === default_format && width === source_dimensions.width
                            };
                        }));
                    });
                });
                // add png placeholder
                promises.push(image
                    .toFormat('png', format_options['png'])
                    .resize(20)
                    .toBuffer()
                    .then(buffer => {
                    return {
                        buffer,
                        width: 20,
                        format: 'image/png',
                        src: getImageSource(`placeholder.png`, buffer),
                        is_placeholder: true
                    };
                }));
                Promise.all(promises).then(image_targets => {
                    let placeholder_data_uri = '';
                    let default_image_source = '';
                    image_targets.forEach(target => {
                        emitFile && !target.is_placeholder && this.emitFile(target.src, target.buffer, null);
                        if (target.is_default) {
                            default_image_source = target.src;
                        }
                        if (target.is_placeholder) {
                            placeholder_data_uri = `data:image/png;base64,${target.buffer.toString('base64')}`;
                        }
                    });
                    callback &&
                        callback(null, imageToString(Object.assign(Object.assign({}, source_dimensions), { src: default_image_source, type: `image/${default_format}`, placeholder: placeholder_data_uri, responsive_images: image_targets
                                .filter(target => !target.is_placeholder)
                                .map(target => {
                                return {
                                    width: target.width,
                                    src: target.src,
                                    type: `image/${target.format}`
                                };
                            }) })));
                });
            }
        })
            .catch(error => {
            callback && callback(error);
        });
    }
};
exports.default = loader;
exports.raw = true;
//# sourceMappingURL=index.js.map