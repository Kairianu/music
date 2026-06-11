import * as colors from 'jsr:@std/fmt/colors';
import * as path from 'jsr:@std/path';


function insensitiveSort(a, b) {
	return a.localeCompare(b, undefined, {
		sensitivity: 'base',
	});
}

function insensitiveArrayContains(array, string) {
	let matchingElement;

	const exists = array.some((element) => {
		const compare = element.localeCompare(string, undefined, {
			ignorePunctuation: true,
			sensitivity: 'base',
			usage: 'search',
		});

		if ( compare == 0 ) {
			matchingElement = element;
			return true;
		}
	});

	return [exists, matchingElement || string];
}

function getMusicFilePath() {
	const scriptDirname = path.dirname(path.fromFileUrl(import.meta.url));

	return path.join(scriptDirname, 'music.json');
}

async function getMusicFileData() {
	return JSON.parse(await Deno.readTextFile(getMusicFilePath()));
}

function getNormalizedBytes(size) {
	return size / 1000;
}

function getNormalizedBytesOutput(size) {
	return getNormalizedBytes(size) + ' KB';
}


async function addSong(givenArtist, givenSong) {
	if ( givenArtist && ! givenSong ) {
		const hyphenMatch = givenArtist.match(/^(.*?)\s+-\s+(.*?)$/);

		if ( hyphenMatch ) {
			givenArtist = hyphenMatch[1];
			givenSong = hyphenMatch[2];
		}
		else {
			const middotMatch = givenArtist.match(/^(.*?)\s+·\s+(.*?)$/);

			if ( middotMatch ) {
				givenArtist = middotMatch[2];
				givenSong = middotMatch[1];
			}
		}
	}


	if ( givenArtist && givenSong ) {
		givenArtist = givenArtist.trim();
		givenSong = givenSong.trim();
	}
	else {
		console.error(colors.red('Invalid artist/song string'));

		return;
	}


	const data = await getMusicFileData();


	const [artistExists, artist] = insensitiveArrayContains(Object.keys(data), givenArtist);

	let artistMessage = colors.dim('Artist:\t') + colors.magenta(artist);

	if ( ! artistExists ) {
		data[artist] = [];

		artistMessage += colors.green(' [Added]');
	}


	const [songExists, song] = insensitiveArrayContains(data[artist], givenSong);

	let songMessage = colors.dim('Song:\t') + colors.cyan(song);

	if ( ! songExists ) {
		data[artist].push(song);
		data[artist].sort(insensitiveSort);

		songMessage += colors.green(' [Added]');
	}


	if ( ! artistExists || ! songExists ) {
		const output = JSON.stringify(data, Object.keys(data).sort(insensitiveSort), '\t');

		await Deno.writeTextFile(getMusicFilePath(), output);
	}

	console.log(artistMessage);
	console.log(songMessage);
}


async function outputSearchResults(searchString) {
	const data = await getMusicFileData();

	const regexp = new RegExp(searchString, 'i');

	for ( const [artist, songs] of Object.entries(data) ) {
		if ( artist.match(regexp) ) {
			console.log(artist, songs);
		}
		else {
			const matchedSongs = [];

			for ( const song of songs ) {
				if ( song.match(regexp) ) {
					matchedSongs.push(song);
				}
			}

			if ( matchedSongs.length > 0 ) {
				console.log(artist, matchedSongs);
			}
		}
	}
}



async function outputMusicInfo() {
	let artistCount = 0;
	let songCount = 0;

	const musicFileInfo = await Deno.stat(getMusicFilePath());

	const data = await getMusicFileData();

	for ( const [artist, songs] of Object.entries(data) ) {
		artistCount++;
		songCount += songs.length;
	}

	const artistMessage = colors.dim('Artists:\t') + colors.magenta(artistCount.toString());
	const songMessage = colors.dim('Songs:\t\t') + colors.cyan(songCount.toString());
	const musicFileSizeMessage = colors.dim('File Size:\t') + colors.yellow(getNormalizedBytesOutput(musicFileInfo.size));

	console.log(artistMessage);
	console.log(songMessage);
	console.log(musicFileSizeMessage);
}





const COMMAND_HANDLERS = {
	add: (args) => {
		addSong(...args);
	},

	info: () => {
		outputMusicInfo();
	},

	search: (args) => {
		outputSearchResults(...args);
	},
};

COMMAND_HANDLERS.a = COMMAND_HANDLERS.add;
COMMAND_HANDLERS.i = COMMAND_HANDLERS.info;
COMMAND_HANDLERS.s = COMMAND_HANDLERS.search;


const command = Deno.args[0];

const commandHandler = COMMAND_HANDLERS[command];

if ( commandHandler ) {
	commandHandler(Deno.args.slice(1));
}
