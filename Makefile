build:
	npm run build
	cp src/*.ts dist
	git add -A
	git commit -am 'update'
	npm version patch
	npm publish .
	git push origin master
