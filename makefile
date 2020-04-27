all: build_front build_back run

build_front:
	cd frontend;tsc --inlineSourceMap --module none --lib ES2015,dom state.ts utils.ts types.ts view.ts tree_render.ts tripcode.ts front.ts --outFile front.js

build_back:
	go build -o bin backend/*.go

run:
	cd frontend; ../bin -port :1337
