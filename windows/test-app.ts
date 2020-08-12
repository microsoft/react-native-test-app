import * as path from 'path';
import * as fs from 'fs';

const windowsDir = 'windows';
const reactNativeModulePath = findClosestPathTo(path.join('node_modules', 'react-native-windows'));
const testAppNodeModulePath = findClosestPathTo(path.join('node_modules', 'react-native-test-app'));
const srcRootPath = path.join(testAppNodeModulePath, windowsDir);
const destPath = path.resolve('');


function findClosestPathTo(fileOrDirName: string): string {
    var basePath = path.resolve('');
    var rootDirectory = basePath.split(path.sep)[0] + path.sep;

    while (basePath !== rootDirectory) {
        const candidatePath = path.join(basePath, fileOrDirName)
        if (fs.existsSync(candidatePath)) {
            return path.relative('', candidatePath);
        }
        //Get parent folder
        basePath = path.dirname(basePath)
    }

    return null
}

/**
 * Text to replace, + config options
 */
export type Replacements = {
    regExpPatternsToRemove?: RegExp[];
    [key: string]: any;
};

function walk(current: string): string[] {
    if (!fs.lstatSync(current).isDirectory()) {
        return [current];
    }

    const files = fs
        .readdirSync(current)
        .map(child => walk(path.join(current, child)));
    const result: string[] = [];
    return result.concat.apply([current], files);
}

/**
 * Get a source file and replace parts of its contents.
 * @param srcPath Path to the source file.
 * @param replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @return The contents of the file with the replacements applied.
 */
export function resolveContents(
    srcPath: string,
    replacements: Replacements,
): string {
    let content = fs.readFileSync(srcPath, 'utf8');

    Object.keys(replacements).forEach(regex => {
        content = content.replace(new RegExp(regex, 'g'), replacements[regex]);
    });

    return content;
}

// Binary files, don't process these (avoid decoding as utf8)
const binaryExtensions = ['.png', '.jar', '.keystore'];

/**
 * Copy a file to given destination, replacing parts of its contents.
 * @param srcPath Path to a file to be copied.
 * @param destPath Destination path.
 * @param replacements: e.g. {'TextToBeReplaced': 'Replacement'}
 */
async function copyAndReplace(
    srcPath: string,
    destPath: string,
    relativeDestPath: string,
    replacements: Replacements = {}
) {
    const fullDestPath = path.join(destPath, relativeDestPath);
    if (fs.lstatSync(srcPath).isDirectory()) {
        if (!fs.existsSync(fullDestPath)) {
            fs.mkdirSync(fullDestPath);
        }
        return;
    }

    const extension = path.extname(srcPath);
    if (binaryExtensions.indexOf(extension) !== -1) {
        // Binary file
        copyBinaryFile(srcPath, fullDestPath, err => {
            if (err) {
                throw err;
            }
        });
    } else {
        // Text file
        const srcPermissions = fs.statSync(srcPath).mode;
        let content = resolveContents(srcPath, replacements);

        fs.writeFileSync(fullDestPath, content, {
            encoding: 'utf8',
            mode: srcPermissions,
        });
    }
}

/**
 * Same as 'cp' on Unix. Don't do any replacements.
 */
function copyBinaryFile(
    srcPath: string,
    destPath: string,
    cb: (err?: Error) => void,
) {
    let cbCalled = false;
    const srcPermissions = fs.statSync(srcPath).mode;
    const readStream = fs.createReadStream(srcPath);
    readStream.on('error', err => {
        done(err);
    });
    const writeStream = fs.createWriteStream(destPath, {
        mode: srcPermissions,
    });
    writeStream.on('error', err => {
        done(err);
    });
    writeStream.on('close', () => {
        done();
    });
    readStream.pipe(writeStream);
    function done(err?: Error) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}

export function createDir(destPath: string) {
    if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
    }
}

export async function copyAndReplaceAll(
    srcPath: string,
    destPath: string,
    relativeDestDir: string,
    replacements: Replacements = {}
) {
    for (const absoluteSrcFilePath of walk(srcPath)) {
        const filename = path.relative(srcPath, absoluteSrcFilePath);
        const relativeDestPath = path.join(relativeDestDir, filename);
        await copyAndReplace(
            absoluteSrcFilePath,
            destPath,
            relativeDestPath,
            replacements
        );
    }
}

const cppSourceFilesExtensions = ['.h', '.cpp', '.idl', '.xaml'];

export async function copySourceFiles(
    srcPath: string,
    destPath: string,
    relativeDestDir: string
) {
    for (const absoluteSrcFilePath of fs.readdirSync(srcPath).map(_ => path.join(srcPath, _))) {
        if (cppSourceFilesExtensions.indexOf(path.extname(absoluteSrcFilePath)) != -1) {
            const filename = path.relative(srcPath, absoluteSrcFilePath);
            const relativeDestPath = path.join(relativeDestDir, filename);

            await copyAndReplace(
                absoluteSrcFilePath,
                destPath,
                relativeDestPath
            );
        }
    }
}

export async function copyProjectTemplateAndReplace() {
    if (!srcRootPath) {
        throw new Error('Need a path to copy from');
    }

    if (!destPath) {
        throw new Error('Need a path to copy to');
    }

    if (!reactNativeModulePath) {
        throw new Error('react-native-windows node module is not installed');
    }

    if (!testAppNodeModulePath) {
        throw new Error('react-native-test-app node module is not installed');
    }

    const projDir = 'ReactTestApp';

    createDir(path.join(destPath, windowsDir));
    createDir(path.join(destPath, windowsDir, projDir));
    createDir(path.join(destPath, windowsDir, projDir, 'Bundle'));

    const manifestFilePath = findClosestPathTo('app.json');

    //Read path to resources from manifest and copy them
    fs.readFile(manifestFilePath, async function (error, content) {
        var resourcesPaths = JSON.parse(content.toString()).resources;
        if (!resourcesPaths) {
            throw new Error('No resources specified in app.json');
        }
        resourcesPaths = resourcesPaths.windows ? resourcesPaths.windows : resourcesPaths;
        for (const resource of resourcesPaths) {
            await copyAndReplaceAll(path.relative(path.dirname(manifestFilePath), resource), destPath, path.join(windowsDir, projDir, 'Bundle', path.basename(resource)));
        }
    });

    const projectFilesReplacements: Record<string, any> = {
        regExpPatternsToRemove: ['//\\sclang-format\\s(on|off)\\s'],

        '<BundleContentRoot>.*</BundleContentRoot>': `<BundleContentRoot>${path.relative(path.join(destPath, windowsDir, projDir), path.join(windowsDir, projDir, 'Bundle'))}\\</BundleContentRoot>`,
        '<ManifestRootPath>.*</ManifestRootPath>': `<ManifestRootPath>${path.relative(path.join(destPath, windowsDir, projDir), path.dirname(manifestFilePath))}\\</ManifestRootPath>`,
        '<ReactNativeModulePath>.*</ReactNativeModulePath>': `<ReactNativeModulePath>${path.relative(path.join(destPath, windowsDir, projDir), reactNativeModulePath)}\\</ReactNativeModulePath>`,
    };

    const projectFilesMappings = [
        {
            from: path.join(srcRootPath, projDir, 'ReactTestApp.vcxproj'),
            to: path.join(windowsDir, projDir, 'ReactTestApp.vcxproj'),
        },
        {
            from: path.join(srcRootPath, projDir, 'PropertySheet.props'),
            to: path.join(windowsDir, projDir, 'PropertySheet.props'),
        },
        {
            from: path.join(srcRootPath, projDir, 'Package.appxmanifest'),
            to: path.join(windowsDir, projDir, 'Package.appxmanifest'),
        },
        {
            from: path.join(srcRootPath, projDir, 'ReactTestApp.vcxproj.filters'),
            to: path.join(
                windowsDir,
                projDir,
                'ReactTestApp.vcxproj.filters',
            ),
        },
        {
            from: path.join(srcRootPath, projDir, 'ReactTestApp_TemporaryKey.pfx'),
            to: path.join(
                windowsDir,
                projDir,
                'ReactTestApp_TemporaryKey.pfx',
            ),
        },
        {
            from: path.join(srcRootPath, projDir, 'packages.config'),
            to: path.join(windowsDir, projDir, 'packages.config'),
        },
    ];

    for (const mapping of projectFilesMappings) {
        await copyAndReplace(
            mapping.from,
            destPath,
            mapping.to,
            projectFilesReplacements
        );
    }

    const solutionFileReplacements = {
        '(?<=(\"|\n))(.[^ ]*)react-native-windows': `$1${path.relative(path.join(destPath, windowsDir), reactNativeModulePath)}`
    };

    await copyAndReplace(
        path.join(srcRootPath, 'ReactTestApp.sln'),
        destPath,
        path.join(windowsDir, 'ReactTestApp.sln'),
        solutionFileReplacements
    );

    await copyAndReplaceAll(
        path.join(srcRootPath, projDir, 'Assets'),
        destPath,
        path.join(windowsDir, projDir, 'Assets')
    );

    await copySourceFiles(
        path.join(srcRootPath, projDir),
        destPath,
        path.join(windowsDir, projDir)
    );

}

copyProjectTemplateAndReplace();
