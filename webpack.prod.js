const path = require('path')
const webpack = require('webpack')
const TypedocWebpackPlugin = require('typedoc-webpack-plugin')
const typedocOption = require('./typedocconfig')

typedocOption.out = path.join(__dirname, typedocOption.out)

module.exports = {
    entry: {
        LetsCache: './src/ts/LetsCache.ts',
    },
    output: {
        path: path.join(__dirname, 'dist', 'js'),
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
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false,
        }),
        new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            compress: {
                dead_code: true,
            }
        }),
        new TypedocWebpackPlugin(typedocOption, 'src/ts'),
    ]
}
