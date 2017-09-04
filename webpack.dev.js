const path = require('path')
const TypedocWebpackPlugin = require('typedoc-webpack-plugin')
const typedocOption = require('./typedocconfig')

// webpackからtypedocを実行した場合、outの指定はwebpack設定output.pathからの
// 相対パスとなってしまう。そのため、typedoc.jsのout指定をプロジェクトルートに連結し
// 絶対パスに変換する。
typedocOption.out = path.join(__dirname, typedocOption.out)

module.exports = {
    entry: {
        LetsCache: './src/ts/LetsCache.ts',
    },
    output: {
        path: path.join(__dirname, 'src', 'js'),
        filename: 'letscache.js',
        library: 'LetsCache',
        libraryTarget: 'umd',
    },
    resolve: {
        extensions: ['.ts', '.js', '.styl', '.html']
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.styl$/,
                loader: 'style-loader!typings-for-css-modules-loader?modules&namedExport&camelCase&importLoaders=1&localIdentName=[path][name]__[local]--[hash:base64:5]!stylus-loader'
            },
            {
                test: /\.html$/,
                loader: "html-loader"
            },
            {
                test: /\.ts$/,
                loader: ['babel-loader', 'ts-loader'],
            }
        ]
    },
    plugins: [
        new TypedocWebpackPlugin(typedocOption, 'src/ts'),
    ],
    devtool: 'inline-source-map',
    devServer: {
        contentBase: 'resources',
        publicPath: '/assets/',
        port: 3000,
        inline: true,
    }
}
