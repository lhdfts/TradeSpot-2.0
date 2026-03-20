// test_integration.ts
import { searchPersons, searchDeals } from './pipedriveService'; // Ajuste o caminho conforme necessário

async function main() {
    console.log("Testing Pipedrive Integration...");

    try {
        // --- Test Person Search ---
        console.log("\n--- Searching for Persons ---");
        const personTerm = "paulocalmoncarpentry@gmail.com";

        // No Python: search_persons(term=person_term, fields="email", exact_match=True)
        // No TS: Passamos os argumentos na ordem definida na função
        const persons = await searchPersons(personTerm, "email", true);

        console.log(`Search Term: ${personTerm}`);
        // json.dumps(obj, indent=2) vira JSON.stringify(obj, null, 2)
        console.log(JSON.stringify(persons, null, 2));

        // Acessando a estrutura de dados com segurança (Optional Chaining ?.)
        // Python: persons.get('data', {}).get('items', [])
        const items = persons?.data?.items || [];

        if (items && items.length > 0) {
            // A estrutura de resposta da busca do Pipedrive geralmente é items[index].item
            const firstResult = items[0];
            const personId = firstResult.item.id;
            const personName = firstResult.item.name;

            console.log(`\nFound Person: ${personName} (ID: ${personId})`);

            // --- Test Deal Search using the Person ID ---
            console.log(`\n--- Searching for Deals for Person ID: ${personId} ---`);

            // No Python: search_deals(person_id=person_id, limit=5)
            // No TS: Usamos o objeto de opções que criamos no passo anterior
            const deals = await searchDeals({
                person_id: personId,
                limit: 5
            });

            console.log(JSON.stringify(deals, null, 2));
        } else {
            console.log("\nNo person found, skipping deal search.");
        }

    } catch (error) {
        console.error("\nError occurred:", error);
    }
}

// Executa a função principal
main();