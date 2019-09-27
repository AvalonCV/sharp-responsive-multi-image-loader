import { loader } from 'webpack';
import { getOptions, interpolateName } from 'loader-utils';

import sharp from 'sharp';

interface CoreImageData {
	src: string;
	type: string;
	width: number;
	height: number;
	placeholder?: string;
	responsive_images?: {
		src: string;
		width: number;
		type: string;
	}[];
}

type ImageData = CoreImageData & {
	[other: string]: any;
};

const imageToString = function(image: ImageData): string {
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
		${image.responsive_images ? `responsive_images: ${JSON.stringify(image.responsive_images)},` : ''}
		};
		module.exports.toString = function() {
			return ${image_src};
		};`;
};

interface ResponsiveImageTarget {
	src: string;
	width: number;
	format: string;
	buffer: Buffer;
	is_default?: boolean;
	is_placeholder?: boolean;
}

export interface LoaderOptions {
	name_prefix?: string;
	target_formats?: string[];
	widths?: number[];
	context?: any;
	regExp?: string;
	emitFile?: boolean;
}

const format_options: { [format: string]: {} } = {
	jpeg: { quality: 85, chromaSubsampling: '4:4:4' } as sharp.JpegOptions,
	webp: { quality: 85 } as sharp.WebpOptions,
	png: {} as sharp.PngOptions
};

const file_extensions: { [format: string]: string } = {
	jpeg: 'jpg',
	png: 'png',
	webp: 'webp'
};

const loader: loader.Loader = function(content): void {
	this.cacheable && this.cacheable(true);
	this.addDependency(this.resourcePath);

	const options: LoaderOptions = getOptions(this) || {};

	const {
		name_prefix = '[name]',
		target_formats = ['jpeg', 'webp'],
		widths = [1280, 640],
		emitFile = true
	} = options;

	const getImageSource = (filename_suffix: string = '[ext]', buffer?: Buffer) => {
		return interpolateName(this, name_prefix + '.' + filename_suffix, {
			context: options.context || this.rootContext || this.context,
			content: buffer || content,
			regExp: options.regExp
		});
	};

	if (typeof content === 'string') {
		throw new Error('This is a raw loader - content should not be a string');
	} else {
		const callback = this.async();
		const image = sharp(content);
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
					callback &&
						callback(
							null,
							imageToString({ ...source_dimensions, src, type: metadata.format || 'undefined' })
						);
				} else {
					// should come from options
					const target_widths = widths.filter(width => width < source_dimensions.width);
					target_widths.push(source_dimensions.width);

					const promises: Promise<ResponsiveImageTarget>[] = [];
					target_formats.forEach(format => {
						target_widths.forEach(width => {
							promises.push(
								image
									.toFormat(format, format_options[format])
									.resize(width)
									.toBuffer()
									.then(buffer => {
										return {
											buffer,
											width,
											format,
											src: getImageSource(`${width}.${file_extensions[format]}`, buffer),
											is_default: format === 'jpeg' && width === source_dimensions.width
										};
									})
							);
						});
					});

					// add png placeholder
					promises.push(
						image
							.toFormat('png', format_options['png'])
							.resize(20)
							.toBuffer()
							.then(buffer => {
								return {
									buffer,
									width: 20,
									format: 'png',
									src: getImageSource(`placeholder.png`, buffer),
									is_placeholder: true
								};
							})
					);

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
							callback(
								null,
								imageToString({
									...source_dimensions,
									src: default_image_source,
									type: 'jpeg',
									placeholder: placeholder_data_uri,
									responsive_images: image_targets
										.filter(target => !target.is_placeholder)
										.map(target => {
											return {
												width: target.width,
												src: target.src,
												type: `ìmage/${target.format}`
											};
										})
								})
							);
					});
				}
			})
			.catch(error => {
				callback && callback(error);
			});
	}
};

export default loader;
export const raw = true;
