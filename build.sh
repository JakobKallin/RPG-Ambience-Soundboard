shopt -s globstar

function compile {
    local SOURCE=${1}
    local TARGET=${2}
    
    # Copy files
    rsync \
        --recursive \
        --links \
        --delete \
        --delete-excluded \
        --exclude=.git \
        --exclude=.sass-cache \
        $SOURCE $TARGET
    echo "Copy: $(realpath $SOURCE) => $(realpath $TARGET)"
    
    # Compile ES6 to JS
    for ES6 in $TARGET/**/*.es6
    do
        JS="${ES6%.*}.js"
        echo "Compile: ${ES6#$TARGET} => ${JS#$TARGET}"
        babel --source-maps inline "$ES6" > "$JS"
    done
    
    NODE_PATH="$TARGET/libraries" browserify "$TARGET/source/main.js" -o "$TARGET/bundle.js" --debug
    
    # Compile SCSS to CSS
    sass --update --force $TARGET/css:$TARGET/css
}

if [ "$#" -ne 2 ]
then
    echo "Usage: build.sh <source> <target>"
    exit
fi

SOURCE="$1"
TARGET="$2"

compile $SOURCE $TARGET

while inotifywait --exclude "\.git" --recursive --event=create,modify,delete,move $SOURCE
do
    compile $SOURCE $TARGET
done
