all: build run

build: build_front build_back

build_front:
	cd frontend;tsc --inlineSourceMap --module none --lib ES2018,dom settings.ts utils.ts types.ts view.ts tree_render.ts tripcode.ts lazy.ts main.ts --outFile front.js
	cd frontend;tsc --inlineSourceMap --module none --lib ES2018,dom settings.ts settingspage.ts --outfile settingspage.js

build_back:
	go build -o bin backend/*.go

run:
	./bin -port :8000 -salt "marmelade"
