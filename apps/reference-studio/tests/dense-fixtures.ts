export const denseFixtureCases = [
	{ fixture: 'dense-200', minimumNodes: 200 },
	{ fixture: 'dense-500', minimumNodes: 500 },
] as const;

export type DenseFixtureCase = typeof denseFixtureCases[number];
