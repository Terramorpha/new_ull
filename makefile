all: build

build: frontend/front.js backend-bin

frontend/front.js: frontend/*.ts
	cd frontend;tsc --inlineSourceMap --module none --lib ES2018,dom settings.ts utils.ts types.ts view.ts tree_render.ts tripcode.ts lazy.ts main.ts --outFile front.js
	cd frontend;tsc --inlineSourceMap --module none --lib ES2018,dom settings.ts settingspage.ts --outfile settingspage.js

backend-bin: backend/*.go
	go build -o backend-bin backend/*.go

run:
	./bin -port :8000 -salt "marmelade"
