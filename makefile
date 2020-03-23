all: compile_front compile_back run

compile_front:
	cd frontend;tsc --inlineSourceMap --module none --lib ES2015,dom utils.ts types.ts view.ts tree_render.ts front.ts --outFile front.js
compile_back:
	go build -o bin backend/*.go
run:
	cd frontend; ../bin -port :1337
