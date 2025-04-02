async function generateProposal(job) {
    const r=await fetch(
        `https://app.wordware.ai/api/released-app/d52a2169-cc9e-4f8b-b98a-bb5a6f066eed/run`,
        {
            method: "post",
            body: JSON.stringify({
                inputs: {
                    upwork_url: job.url
                },
                version: "^2.0"
            }),
            headers: {
                Authorization: `Bearer ${process.env.WORDWARE_API_KEY}`,
            },
        }
    );

    if(!r.ok) {
        console.error("Run failed",await r.json());
        throw Error(`Run failed ${r.status}`);
    }

    const reader=r.body.getReader();
    const decoder=new TextDecoder();
    let buffer=[];
    let finalOutput=null;

    try {
        while(true) {
            const {done,value}=await reader.read();

            if(done) {
                break;
            }

            const chunk=decoder.decode(value);

            for(let i=0,len=chunk.length; i<len; ++i) {
                const isChunkSeparator=chunk[i]==="\n";

                if(!isChunkSeparator) {
                    buffer.push(chunk[i]);
                    continue;
                }

                const line=buffer.join("").trimEnd();
                const content=JSON.parse(line);
                const value=content.value;

                if(value.type==="generation") {
                    if(value.state==="start") {
                        console.log("\nNEW GENERATION -",value.label);
                    } else {
                        console.log("\nEND GENERATION -",value.label);
                    }
                } else if(value.type==="outputs") {
                    finalOutput=value.values["final_result"];
                    if(finalOutput) {
                        console.log("Proposal generated successfully");
                    } else {
                        throw Error("Proposal generation failed");
                    }
                    break;
                }

                buffer=[];
            }

            if(finalOutput) {
                break;
            }
        }
    } finally {
        reader.releaseLock();
    }

    return finalOutput;
}

module.exports={
    generateProposal
}