import path from 'path';
import webpack from 'webpack';
import memoryfs from 'memory-fs';

import { LoaderOptions } from './../src/index';

interface TestResult {
	stats: webpack.Stats;
	files: string[];
}

export default async (test_file: string, options: LoaderOptions = {}): Promise<TestResult> => {
	const compiler = webpack({
		context: __dirname,
		entry: `./${test_file}`,
		output: {
			path: path.resolve(__dirname),
			filename: 'bundle.js'
		},
		module: {
			rules: [
				{
					test: /\.(jpe?g|png|gif|webp|svg)$/,
					use: {
						loader: path.resolve(__dirname, './../src/index.ts'),
						options: options
					}
				}
			]
		}
	});

	const outputFileSystem = new memoryfs();
	compiler.outputFileSystem = outputFileSystem;

	return new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
			} else if (stats.hasErrors()) {
				reject(new Error(stats.toJson().errors.join(' ')));
			} else {
				resolve({
					stats,
					files: outputFileSystem
						.readdirSync(path.resolve(__dirname))
						.filter(filename => filename !== 'bundle.js')
						.sort()
				});
			}
		});
	});
};
