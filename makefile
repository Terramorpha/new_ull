all: build_front build_back run

build_front:
	cd frontend;tsc --inlineSourceMap --module none --lib ES2018,dom settings.ts utils.ts types.ts view.ts tree_render.ts tripcode.ts lazy.ts main.ts --outFile front.js
	cd frontend;tsc --inlineSourceMap --module none --lib ES2018,dom settings.ts settingspage.ts --outfile settingspage.js

build_back:
	go build -o bin backend/*.go

run:
	cd frontend; ../bin -port :1337 -salt "$(shell cat salt.txt)"
