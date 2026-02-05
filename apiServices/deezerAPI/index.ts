import { DeezerAPI } from "./deezer.ts";

async function main() {
  const api = new DeezerAPI();

  // Search track by title only
  const tracks = await api.searchTrack("hello");
  if (tracks.data && tracks.data.length > 0) {
    console.log("Tracks found:");
    tracks.data.forEach((track: any, idx: number) => {
      console.log(`Track #${idx + 1}:`);
      console.log(`  Title: ${track.title || track.name || track.title_short}`);
      if (track.artist && track.artist.name) {
        console.log(`  Artist: ${track.artist.name}`);
      } else if (track.artist) {
        console.log(`  Artist: ${track.artist}`);
      } else if (track.artist_name) {
        console.log(`  Artist: ${track.artist_name}`);
      }
      if (track.album && track.album.title) {
        console.log(`  Album: ${track.album.title}`);
      } else if (track.album) {
        console.log(`  Album: ${track.album}`);
      } else if (track.album_title) {
        console.log(`  Album: ${track.album_title}`);
      }
      if (track.duration) {
        console.log(`  Duration: ${track.duration} seconds`);
      }
      if (track.id) {
        console.log(`  ID: ${track.id}`);
      }
      console.log('---');
    });
  } else {
    console.log("No tracks found.");
  }
  //console.log(tracks.data);
  /*
  // Search artist
  const artists = await api.searchArtist("Coldplay");
  console.log("Artists:", artists.data);

  // Search album
  const albums = await api.searchAlbum("Parachutes");
  console.log("Albums:", albums.data);

  // Lookup a track by ID
  if (tracks.data.length > 0) {
    const track = await api.lookupTrack(tracks.data[0].id);
    console.log("Track details:", track);
  }
    */
}       // to try out: npx ts-node apiServices\deezerAPI\index.ts

main();