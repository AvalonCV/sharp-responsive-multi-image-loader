import webkit_compiler from './compiler';
import requireFromString from 'require-from-string';
import { LoaderOptions } from '../src/index';

interface ImageData {
	src: string;
	width: number;
	height: number;
	bytes?: number;
	type: string;
	[other: string]: any;
}

interface TestData {
	image: ImageData;
	files: string[];
}

export const getWebpackTestData = async (filename: string, options: LoaderOptions = {}): Promise<null | TestData> => {
	return new Promise(async resolve => {
		const result = await webkit_compiler(filename, options);
		const modules = result.stats.toJson().modules;

		let output = modules && modules[0] ? modules[0].source : null;
		if (output) {
			resolve({
				image: requireFromString(output.replace('__webpack_public_path__', `''`)) as ImageData,
				files: result.files
			});
		} else {
			resolve(null);
		}
	});
};

interface TestImage {
	additional_description?: string;
	input_file: string;
	expected_default_image: {
		src: string;
		width: number;
		height: number;
		type: string;
		placeholder?: string;
		responsive_images?: {
			src: string;
			type: string;
			width: number;
		}[];
	};
	expected_files: string[];
}

export const test_images: TestImage[] = [
	{
		additional_description: 'compressed by guetzli',
		input_file: 'Bristol-WML-2.84.jpg',
		expected_default_image: {
			src: 'Bristol-WML-2.84.1442.jpg',
			width: 1442,
			height: 518,
			type: 'jpeg',
			placeholder:
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAHCAIAAACHqfpvAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABtklEQVQY0wGrAVT+ACYgHSohJFpOSnNjVGBPQ5aHdc3HutjWzcK6paugkK+lkszGttnVzc7FtJiDbrOZhbSbh6yTgcKpj7SYeABFPjU9Oz1JR0tJQUdMPD16Y1qYgnOii3jAtabX1dTTzsi9s6WikYWPclmGZlCjh25vVUqSfHOjhWOskWAANzcrQT01ST8/Ozc7TDw6YEE5Z1RSWz8za1haqKOqlIuQZldXZ1NFa1M7ako2cllJalM/emBJWkUza1tGADwsH2dMOmNGQFlALT0vJ04zJ11JP1NCPlZCQHRuem1jaU46NFA9N1k/LV49LnNdRWFPN1pne4RwXZJtSABGKhhdPShkRTFdPCI8KiJBMCpHNjJOOi9QOi5tbHlqZGZPMB1LNS1DMjFFMy1ZQCpZQi9LQUJoU0ZySywASyoXPCoiPikiNR8VNCUfPTIvTDguQSIQUj84VlZaYV5fUTcrOBwPUTsvUEA8WD4yUjEcOiQZOSkkWjsnADcgFTMgGisUDTMkHzUvLkMzKVQyHFw2GVtMSVBVUFdcV2ZRR04oDFkxGEQzKU8/PEs7Ny8eGTceES8dGk0djh9f6MtPAAAAAElFTkSuQmCC'
		},
		expected_files: [
			'Bristol-WML-2.84.1280.jpg',
			'Bristol-WML-2.84.640.jpg',
			'Bristol-WML-2.84.1442.jpg',
			'Bristol-WML-2.84.1280.webp',
			'Bristol-WML-2.84.640.webp',
			'Bristol-WML-2.84.1442.webp'
		]
	},
	{
		input_file: 'PNG_transparency_demonstration_2.png',
		expected_default_image: {
			src: 'PNG_transparency_demonstration_2.800.jpg',
			width: 800,
			height: 600,
			type: 'jpeg'
		},
		expected_files: [
			'PNG_transparency_demonstration_2.640.jpg',
			'PNG_transparency_demonstration_2.800.jpg',
			'PNG_transparency_demonstration_2.640.webp',
			'PNG_transparency_demonstration_2.800.webp'
		]
	},
	{
		input_file: 'test3.webp',
		expected_default_image: {
			src: 'test3.1280.jpg',
			width: 1280,
			height: 720,
			type: 'jpeg'
		},
		expected_files: ['test3.640.jpg', 'test3.1280.jpg', 'test3.640.webp', 'test3.1280.webp']
	},
	{
		input_file: 'Rotating_earth_(large).gif',
		expected_default_image: {
			src: 'Rotating_earth_(large).400.jpg',
			width: 400,
			height: 400,
			type: 'jpeg',
			responsive_images: [
				{
					src: 'Rotating_earth_(large).400.jpg',
					type: 'ìmage/jpeg',
					width: 400
				},
				{
					src: 'Rotating_earth_(large).400.webp',
					type: 'ìmage/webp',
					width: 400
				}
			]
		},
		expected_files: ['Rotating_earth_(large).400.jpg', 'Rotating_earth_(large).400.webp']
	},
	{
		input_file: 'SVG_logo.svg',
		expected_default_image: {
			src: 'SVG_logo.svg',
			width: 100,
			height: 100,
			type: 'svg'
		},
		expected_files: ['SVG_logo.svg']
	}
];

describe('A nice webpack loader for images', () => {
	test_images.forEach(element => {
		test(`should load ${element.input_file.split('.').pop()} files ${element.additional_description ||
			''}`, async () => {
			const test_data = await getWebpackTestData('./images/' + element.input_file);

			expect(test_data && test_data.image).toMatchObject(element.expected_default_image);
			expect(test_data && test_data.files).toMatchObject(element.expected_files);
		});
	});
});

describe('A nice webpack loader for images - without emitting any files', () => {
	test_images.forEach(element => {
		test(`should load ${element.input_file.split('.').pop()} files`, async () => {
			const test_data = await getWebpackTestData('./images/' + element.input_file, { emitFile: false });

			expect(test_data && test_data.image).toMatchObject(element.expected_default_image);
			expect(test_data && test_data.files).toMatchObject([]);
		});
	});
});

describe('A nice webpack loader for images - with custom hash file-prefix', () => {
	test_images.forEach(element => {
		test(`should load ${element.input_file.split('.').pop()} files ${element.additional_description ||
			''}`, async () => {
			const test_data = await getWebpackTestData('./images/' + element.input_file, {
				name_prefix: '[name].[hash:7]'
			});

			expect(test_data && test_data.image).toMatchObject(element.expected_default_image);
		});
	});
});

describe('A nice webpack loader for images - with only webp output', () => {
	test_images.forEach(element => {
		test(`should load ${element.input_file.split('.').pop()} files ${element.additional_description ||
			''}`, async () => {
			const test_data = await getWebpackTestData('./images/' + element.input_file, {
				target_formats: ['webp']
			});

			expect(test_data && test_data.image).toMatchObject(element.expected_default_image);
		});
	});
});

describe('A nice webpack loader for images - with custom sizes', () => {
	test_images.forEach(element => {
		test(`should load ${element.input_file.split('.').pop()} files ${element.additional_description ||
			''}`, async () => {
			const test_data = await getWebpackTestData('./images/' + element.input_file, {
				widths: [320, 480, 800, 1200]
			});

			expect(test_data && test_data.image).toMatchObject(element.expected_default_image);
		});
	});
});
