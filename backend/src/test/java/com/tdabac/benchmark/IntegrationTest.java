import com.tdabac.service.BlockchainService;
import org.junit.jupiter.api.Test;
import java.io.File;

public class IntegrationTest {
    @Test
    public void verifyHardhatIntegration() throws Exception {
        String workingDir = "../smart-contracts";
        File addressFile = new File(workingDir + "/contract-address.txt");
        if (!addressFile.exists()) {
            System.err.println("TEST SKIP: Contract address file not found. Deploy contract first.");
            return;
        }

        BlockchainService service = new BlockchainService();
        String dummyHash = "QmTestVerification" + System.currentTimeMillis();

        // Measure upload
        long startUpload = System.currentTimeMillis();
        try {
            service.uploadFile(dummyHash, 3600);
        } catch (Exception e) {
            System.err.println("Upload failed: " + e.getMessage());
        }
        long endUpload = System.currentTimeMillis();
        System.out.println("Integration Upload Completed in " + (endUpload - startUpload) + "ms.");

        // Measure check
        long startCheck = System.currentTimeMillis();
        boolean result = service.checkAccess(dummyHash);
        long endCheck = System.currentTimeMillis();
        System.out.println("Integration Check Completed in " + (endCheck - startCheck) + "ms. Result: " + result);
    }
}
