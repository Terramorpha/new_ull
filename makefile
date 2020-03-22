all: compile_front compile_back run

compile_front:
	tsc --inlineSourceMap --module none --lib ES2015,dom frontend/*.ts --outFile frontend/front.js
compile_back:
	go build -o bin backend/*.go
run:
	cd frontend; ../bin -port :1337
