module.exports = {
	roots: ['<rootDir>/src', '<rootDir>/test'],
	transform: {
		'^.+\\.tsx?$': 'ts-jest'
	},
	testEnvironment: 'node',
	testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
