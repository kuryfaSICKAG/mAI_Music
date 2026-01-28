import { renamePlaylist, addSongToPlaylist, removeSong, removeSongByIndex } from "../utils/playlist_data.ts";
import { activeUser } from "../utils/user_data.ts";
import { getPlaylists } from "../utils/playlist_data.ts";
import { question, questionInt } from "readline-sync";
import { drawPlaylist } from "./playlist.ts";
import { formatPlaylists } from "../utils/format.ts";

export function editPlaylist(name : string){
    console.clear()
    console.log("\n                     |========= Willkommen bei mAI music =========|")
    console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist "${name}" bearbeiten\n------------------------`)

    if(name === ""){
        name = question("~ Welche Playlist willst du bearbeiten?")
        console.log(formatPlaylists(getPlaylists(activeUser)))
        if(name === ""){
            console.log("# Gib einen gültigen Namen ein!")
            return editPlaylist(name)
        }
    }
    
    let menu : number = questionInt(">>> Playlist umbenennen (1)\n>>> Song hinzufügen (2)\n>>> Song entfernen (3)\n>>> Zurück (4)\n\n> ")
    switch(menu){
            case 1:
                let oldName : string = name
                let newName : string = question(`Alter Name: ${oldName}\nNeuen Namen eingeben: `)
                if(newName === ""){
                    console.log("# Gib einen gültigen Namen ein!")
                    return editPlaylist(name)
                }
                renamePlaylist(activeUser, oldName, newName)
                name = newName
                break
            case 2:

                break
            case 3:
                
                break
            case 4:
                return drawPlaylist(activeUser)
            default:
                console.log("nöööö")
        }

    //hier auslesen und bereit machen zum reinschreiben
    //gui
}