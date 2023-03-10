import fetch from "node-fetch";
import {
  AutomationEvent,
  AutomationInterface,
  AutomationMetadata,
} from "../sdk";

const API_BASE = "https://api.dev.devrev-eng.ai/";

export class App implements AutomationInterface {
  //Getting metadata for the Snap-in
  GetMetadata(): AutomationMetadata {
    return {
      name: "SnapIn to automatically add tags to tickets",
      version: "0.1",
    };
  }
  //main runner function
  async Run(events: AutomationEvent[]) {
    console.log("SnapIn to automatically add tags to tickets");
    await this.EventListener(events[0]);
  }

  // Function to create tags not present and add them to ticket
  async addTags(
    tagsCreateMethod: string,
    addTagsMethod: string,
    tags: string[],
    tagsList,
    authorization: string,
    ticketID: string,
    tagsListAPIMethodPath: string
  ) {
    const urlToAddTags = API_BASE + addTagsMethod;
    const urlToCreateTag = API_BASE + tagsCreateMethod;
    let tagIDList: string[] = [];

    // Checking if a tag is present if yes save its id otherwise create a new tag and then save its id
    for (let i = 0; i < tags.length; i++) {
      if (tagsList.has(tags[i])) {
        continue;
      } else {
        let tagData = {
          name: tags[i],
        };

        await fetch(urlToCreateTag, {
          method: "POST",
          headers: {
            authorization,
            "content-type": "application/json",
          },
          body: JSON.stringify(tagData),
        }).catch((error) => console.log("error", error));
      }
    }

    // New tags list with all the tags required
    const newTagsList = await this.getTagsList(
      tagsListAPIMethodPath,
      authorization
    );

    // save the ids of the tags to be added to the ticket
    for (let i = 0; i < tags.length; i++) {
      if (newTagsList.has(tags[i])) {
        tagIDList.push(newTagsList.get(tags[i]));
      }
    }

    let data: Object[] = [];

    data.push({ id: tagIDList[0] });

    for (let i = 1; i < tagIDList.length; i++) {
      data.push({
        id: tagIDList[i],
      });
    }
    // Creating the JSON for adding tags
    let tagAddJSON = {
      id: ticketID,
      type: "ticket",
      tags: {
        set: data,
      },
    };

    const resp = await fetch(urlToAddTags, {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify(tagAddJSON),
    });
    return resp;
  }

  // Getting the tags list already existing to compare them with the tags we need to add
  async getTagsList(method: string, token: string) {
    var requestOptions = {
      method: "GET",
      headers: {
        Authorization: token,
      },
    };

    let params = {
      limit: 100,
    };

    let query = Object.keys(params)
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
      .join("&");

    let url = API_BASE + method + "?" + query;
    let next_cursor: string = "";
    let tagsList = new Map();
    await fetch(url, requestOptions)
      .then((response) => response.json())
      .then((response) => {
        for (let i = 0; i < response.tags.length; i++) {
          // saving both name and id of the tags in a map
          tagsList.set(response.tags[i].name, response.tags[i].id);
        }
        if (response.hasOwnProperty(next_cursor))
          next_cursor = response.next_cursor;
        else next_cursor = "";
      })
      .catch((error) => console.log("error", error));

    // recursively calling the api to get a list of tags until we don't have the next_cursor key in the response
    while (next_cursor !== "") {
      let paramsCursor = {
        limit: 100,
        cursor: next_cursor,
      };
      let queryCursor = Object.keys(paramsCursor)
        .map(
          (k) =>
            encodeURIComponent(k) + "=" + encodeURIComponent(paramsCursor[k])
        )
        .join("&");
      let urlCursor = API_BASE + method + "?" + queryCursor;
      await fetch(urlCursor, requestOptions)
        .then((response) => response.json())
        .then((response) => {
          for (let i = 0; i < response.tags.length; i++) {
            // saving both name and id of the tags in a map
            tagsList.set(response.tags[i].name, response.tags[i].id);
          }
          if (response.hasOwnProperty(next_cursor))
            next_cursor = response.next_cursor;
          else next_cursor = "";
        })
        .catch((error) => console.log("error", error));
    }
    return tagsList;
  }

  // Extracting title and body of the created ticket, concatenating them and return them as an array of words
  async getTicketDetails(method: string, ticketID: string, token: string) {
    var requestOptions = {
      method: "GET",
      headers: {
        Authorization: token,
      },
    };

    let params = {
      id: ticketID,
    };

    let query = Object.keys(params)
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
      .join("&");

    let url = API_BASE + method + "?" + query;

    let ticketDetails = await fetch(url, requestOptions)
      .then((response) => {
        return response.json();
      })
      .then((result) => {
        let data = result;
        return data.work.title + " " + data.work.body;
      })
      .catch((error) => console.log("error", error));
    return ticketDetails.split(" ");
  }

  // Main EventListener
  async EventListener(event: AutomationEvent) {
    const s = JSON.stringify(event.payload);
    console.log(
      `Checking and creating (if needed) tags for ticket creation event!`,
      s
    );

    // To get the Work Type
    const workType = event.payload.work_created.work.type;

    // IDs
    const ticketID = event.payload.work_created.work.id;

    // Routes
    const ticketDetailsAPIMethodPath = "works.get";
    const tagsListAPIMethodPath = "tags.list";
    const tagsCreateAPIMethodPath = "tags.create";
    const addTagsAPIMethodPath = "works.update";

    // Globals
    const globals = event.input_data.global_values;

    const devrevToken = event.input_data.keyrings["devrev"];
    
    let ticketDetails: string[] = [];
    if (workType == "ticket") {
      // Fetching title string from ticket using ticket id
      try {
        ticketDetails = await this.getTicketDetails(
          ticketDetailsAPIMethodPath,
          ticketID,
          devrevToken
        );
      } catch (error) {
        console.error("Error: ", error);
      }

      try {
        if (ticketDetails.length != 0) {
          // Get tags list to match existing tags against those required to be added
          const tagList = await this.getTagsList(
            tagsListAPIMethodPath,
            devrevToken
          );

          const keywordsJSON = globals.keywords_list;
          const data = JSON.parse(keywordsJSON);
          let keywords = Object.keys(data);
          let tagsToBeAdded: string[] = [];

          // Looking for keywords in the title and description of the ticket and creating a list of tags to be added to the ticket
          for (let i = 0; i < keywords.length; i++) {
            for (let j = 0; j < ticketDetails.length; j++) {
              if (keywords[i].toLowerCase() == ticketDetails[j].toLowerCase()) {
                tagsToBeAdded.push(data[keywords[i]]);
              }
            }
          }

          // Adding the tags corresponding to the keywords
          const resp = await this.addTags(
            tagsCreateAPIMethodPath,
            addTagsAPIMethodPath,
            tagsToBeAdded,
            tagList,
            devrevToken,
            ticketID,
            tagsListAPIMethodPath
          );

          if (resp.ok) {
            console.log("Successfully added tags.");
          } else {
            let body = await resp.text();
            console.error("Error while adding tags: ", resp.status, body);
          }
        }
      } catch (error) {
        console.error("Error: ", error);
      }
    }
  }
}
