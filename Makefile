build:
	npm run build
	git add -A
	git commit -am 'update'
	npm version patch
	git push github master

