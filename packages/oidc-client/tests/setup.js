import { configDefaults } from 'vitest/config'
import {defineConfig} from "vite";

export default defineConfig({
    //plugins: [react(), tsconfigPaths()],
    test: {
        exclude:[
            ...configDefaults.exclude,
            'public/*'
        ]
    },
});