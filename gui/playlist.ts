import { questionInt, question, keyInYN } from "readline-sync";
import { drawMenu } from "./menu.ts"
import { getPlaylists, createPlaylist, deletePlaylist } from "../utils/playlist_data.ts";
import { editPlaylist } from "./editPlaylist.ts";
import { formatPlaylists } from "../utils/format.ts";

export function drawPlaylist(activeUser : string){
    console.clear()
    console.log("\n                     |========= Willkommen bei mAI music =========|")
    console.log(`\n------------------------\n${activeUser}'s Playlists\n------------------------`)
    
    console.log(formatPlaylists(getPlaylists(activeUser)))

    let menu : number = questionInt("\n>>> Erstellen (1)\n>>> Bearbeiten (2)\n>>> Löschen (3)\n>>> Zurück (4)\n\n> ")
    let name : string

    switch(menu){
        case 1:
            console.clear()
            console.log("\n                     |========= Willkommen bei mAI music =========|")
            console.log(`\n------------------------\n${activeUser}'s Playlists\nNeue Playlist erstellen\n------------------------`)

            name = question("~ Wie soll die Playlist heißen?\n> ")
            if(name === ""){
                console.log("# Gib einen gültigen Namen ein!")
                return drawPlaylist(activeUser)
            }
            createPlaylist(activeUser, name)
            let nowEdit : string = question(`Willst du deine erstelle Playlist "${name}" direkt bearbeiten (y/n)?\n`)
            if(nowEdit === "y"||"Y"){
                editPlaylist(name)
            }
            drawPlaylist(activeUser)
            break
        case 2:
            console.clear()
            console.log("\n                     |========= Willkommen bei mAI music =========|")
            console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist bearbeiten\n------------------------`)

            console.log(formatPlaylists(getPlaylists(activeUser)))
            name = question("\n~ Welche Playlist willst du bearbeiten?\n")
            if(name === ""){
                console.log("# Gib einen gültigen Namen ein!")
                return drawPlaylist(activeUser)
            }
            editPlaylist(name)
            break
        case 3:
            console.clear()
            console.log("\n                     |========= Willkommen bei mAI music =========|")
            console.log(`\n------------------------\n${activeUser}'s Playlists\nPlaylist löschen\n------------------------`)

            console.log(formatPlaylists(getPlaylists(activeUser)))
            name = question("\n~ Welche Playlist willst du löschen?\n")
            if(name === ""){
                console.log("# Gib einen gültigen Namen ein!")
                return drawPlaylist(activeUser)
            }
            deletePlaylist(activeUser, name)
            break
        case 4:
            return drawMenu(activeUser, true)
        default:
            console.log("nöööö")
    }
}