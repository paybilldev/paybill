import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	rollup: {
		emitCJS: true,
		esbuild: {
			treeShaking: true,
		},
	},
	declaration: true,
	outDir: "dist",
	clean: true,
	failOnWarn: false,
	externals: ["lodash", "deepmerge", "dayjs", "minimatch"],
	entries: ["./src/index.ts"],
});
